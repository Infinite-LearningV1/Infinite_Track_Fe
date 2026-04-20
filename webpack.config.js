const path = require("path");
const glob = require("glob");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const webpack = require("webpack");
require("dotenv").config({
  path: process.env.NODE_ENV === "production" ? ".env.production" : ".env",
});

const devServer = {
  static: {
    directory: path.join(__dirname, "build"),
  },
  host: process.env.WEBPACK_DEV_HOST || "127.0.0.1",
  allowedHosts: "all",
  compress: true,
  port: 3000,
  hot: true,
  open: process.env.WEBPACK_OPEN === "true",
  historyApiFallback: true,
  proxy: [
    {
      context: ["/api"],
      target:
        process.env.WEBPACK_API_PROXY_TARGET || "http://localhost:3005",
      changeOrigin: true,
      secure: false,
      logLevel: "debug",
      onError: (err, req, res) => {
        console.log("Proxy Error:", err);
        if (!res.headersSent) {
          res.writeHead(502, { "Content-Type": "text/plain" });
        }
        res.end("Bad Gateway");
      },
      onProxyReq: (proxyReq, req, res) => {
        console.log("Proxying request to:", proxyReq.path);
      },
    },
  ],
};

const INCLUDE_PATTERN =
  /<include\s+src=["'](.+?)["']\s*\/?>\s*(?:<\/include>)?/gis;

const processNestedHtml = (content, loaderContext, dir = null) =>
  !INCLUDE_PATTERN.test(content)
    ? content
    : content.replace(INCLUDE_PATTERN, (m, src) => {
        const filePath = path.resolve(dir || loaderContext.context, src);
        loaderContext.dependency(filePath);
        return processNestedHtml(
          loaderContext.fs.readFileSync(filePath, "utf8"),
          loaderContext,
          path.dirname(filePath),
        );
      });

// HTML generation
const paths = [];
const generateHTMLPlugins = () =>
  glob.sync("./src/*.html").map((dir) => {
    const filename = path.basename(dir);

    if (filename !== "404.html") {
      paths.push(filename);
    }

    return new HtmlWebpackPlugin({
      filename,
      template: `./src/${filename}`,
      favicon: `./src/images/favicon.ico`,
      inject: "body",
    });
  });

module.exports = {
  mode: process.env.NODE_ENV === "production" ? "production" : "development",
  entry: "./src/js/index.js",
  devServer: devServer,
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
          },
        },
      },
      {
        test: /\.css$/i,
        use: [
          MiniCssExtractPlugin.loader,
          "css-loader",
          {
            loader: "postcss-loader",
            options: {
              postcssOptions: {
                plugins: [
                  require("autoprefixer")({
                    overrideBrowserslist: ["last 2 versions"],
                  }),
                ],
              },
            },
          },
        ],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: "asset/resource",
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: "asset/resource",
      },
      {
        test: /\.html$/,
        loader: "html-loader",
        options: {
          preprocessor: processNestedHtml,
        },
      },
    ],
  },
  plugins: [
    ...generateHTMLPlugins(),
    new MiniCssExtractPlugin({
      filename: "style.css",
      chunkFilename: "style.css",
    }),
    // Define plugin untuk menginjeksi environment variables
    new webpack.DefinePlugin({
      "process.env.API_BASE_URL": JSON.stringify(
        process.env.API_BASE_URL || "/api",
      ),
      "process.env.API_AUTH_ENDPOINT": JSON.stringify(
        process.env.API_AUTH_ENDPOINT || "/auth",
      ),
      "process.env.API_VERSION": JSON.stringify(
        process.env.API_VERSION || "v1",
      ),
      "process.env.APP_NAME": JSON.stringify(
        process.env.APP_NAME || "Infinite Track",
      ),
      "process.env.APP_VERSION": JSON.stringify(
        process.env.APP_VERSION || "2.0.1",
      ),
      "process.env.APP_ENVIRONMENT": JSON.stringify(
        process.env.APP_ENVIRONMENT || "development",
      ),
      "process.env.SESSION_TIMEOUT": JSON.stringify(
        process.env.SESSION_TIMEOUT || "3600000",
      ),
      "process.env.REMEMBER_ME_DAYS": JSON.stringify(
        process.env.REMEMBER_ME_DAYS || "7",
      ),
      "process.env.DEFAULT_LANGUAGE": JSON.stringify(
        process.env.DEFAULT_LANGUAGE || "id",
      ),
      "process.env.TIMEZONE": JSON.stringify(
        process.env.TIMEZONE || "Asia/Jakarta",
      ),
      "process.env.DEBUG_MODE": JSON.stringify(
        process.env.DEBUG_MODE || "false",
      ),
      "process.env.LOG_LEVEL": JSON.stringify(process.env.LOG_LEVEL || "info"),
    }),
  ],
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "build"),
    clean: true,
    assetModuleFilename: "[path][name][ext]",
  },
  target: "web", // fix for "browserslist" error message
  stats: "errors-only", // suppress irrelevant log messages
};
