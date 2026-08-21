const path = require("path");
const glob = require("glob");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const webpack = require("webpack");
require("dotenv").config();

const projectRoot = __dirname;

const INCLUDE_PATTERN =
  /<include\s+src=["'](.+?)["']\s*\/?>\s*(?:<\/include>)?/gis;

const processNestedHtml = (content, loaderContext, dir = null) =>
  !INCLUDE_PATTERN.test(content)
    ? content
    : content.replace(INCLUDE_PATTERN, (m, src) => {
        const filePath = path.resolve(
          dir || path.dirname(loaderContext.resourcePath),
          src,
        );
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
  glob.sync("src/*.html", { cwd: projectRoot }).map((dir) => {
    const filename = path.basename(dir);

    if (filename !== "404.html") {
      paths.push(filename);
    }

    const template = path.join(projectRoot, "src", filename);

    return new HtmlWebpackPlugin({
      filename,
      template,
      favicon: path.join(projectRoot, "src", "images", "favicon.ico"),
      inject: "body",
    });
  });

const devServer = {
  static: {
    directory: path.join(__dirname, "build"),
  },
  host: process.env.WEBPACK_DEV_HOST || "127.0.0.1",
  allowedHosts: "auto",
  compress: true,
  port: 3000,
  hot: true,
  open: process.env.WEBPACK_OPEN === "true",
  historyApiFallback: true,
  proxy: [
    {
      context: ["/api"],
      target: process.env.WEBPACK_API_PROXY_TARGET || "http://localhost:3005",
      changeOrigin: true,
      secure: false,
      logLevel: "debug",
      onError: (err, req, res) => {
        console.log("Proxy Error:", err);
      },
      onProxyReq: (proxyReq, req, res) => {
        console.log("Proxying request to:", proxyReq.path);
      },
    },
  ],
};

module.exports = {
  mode: process.env.NODE_ENV === "production" ? "production" : "development",
  context: projectRoot,
  entry: path.join(projectRoot, "src", "js", "index.js"),
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
          "postcss-loader",
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
      "process.env.APP_ENVIRONMENT": JSON.stringify(
        process.env.APP_ENVIRONMENT || "development",
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
  devServer,
  target: "web", // fix for "browserslist" error message
  stats: "errors-only", // suppress irrelevant log messages
};
