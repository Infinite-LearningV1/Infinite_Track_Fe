/**
 * User API Service
 * Mengenkapsulasi logika panggilan API untuk manajemen pengguna
 */

import { API_CONFIG, envLog } from "../config/env.js";
import {
  validatePhotoFile,
  handlePhotoUploadError,
  PHOTO_CONFIG,
} from "../utils/photoValidation.js";
import { authRequest } from "./authRequest.js";

/**
 * Mengambil daftar pengguna dari API
 * @param {Object} params - Parameter query untuk filtering dan sorting
 * @param {string} params.search - Kata kunci pencarian
 * @param {string} params.sortBy - Field untuk sorting
 * @param {string} params.sortOrder - Urutan sorting (ASC/DESC)
 * @returns {Promise<Array>} - Promise yang resolve dengan array pengguna atau reject dengan error
 */
async function getUsers(params = {}) {
  try {
    envLog("debug", "Fetching users with params:", params);

    // Bangun URL dengan query parameters
    const url = new URL(`${API_CONFIG.BASE_URL}/users`, window.location.origin);

    // Tambahkan parameter query jika ada
    if (params.search) {
      url.searchParams.append("search", params.search);
    }
    if (params.sortBy) {
      url.searchParams.append("sortBy", params.sortBy);
    }
    if (params.sortOrder) {
      url.searchParams.append("sortOrder", params.sortOrder);
    }

    envLog("debug", "Requesting users from URL:", url.toString());

    // Lakukan panggilan GET ke endpoint users
    const response = await authRequest({
      method: "get",
      url: url.toString(),
    });

    // Periksa response dari backend
    if (response.data && response.data.success === true) {
      const users = response.data.data;
      envLog("debug", "Successfully fetched users:", users);
      return users;
    } else {
      // Jika backend mengembalikan success: false
      const errorMessage =
        response.data.message || "Gagal mengambil data pengguna";
      throw new Error(errorMessage);
    }
  } catch (error) {
    envLog("error", "Error fetching users:", error);

    // Handle different types of errors
    if (error.response) {
      // Error response dari server
      const status = error.response.status;
      const data = error.response.data;

      if (status === 401) {
        throw new Error("Sesi Anda telah berakhir. Silakan login kembali.");
      } else if (status === 403) {
        throw new Error(
          "Anda tidak memiliki akses untuk melihat data pengguna.",
        );
      } else if (status === 500) {
        throw new Error("Terjadi kesalahan server. Silakan coba lagi nanti.");
      } else {
        const message =
          data?.message || `Error ${status}: Gagal mengambil data pengguna`;
        throw new Error(message);
      }
    } else if (error.request) {
      // Error karena tidak ada response (network error)
      throw new Error(
        "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.",
      );
    } else {
      // Error lainnya
      throw new Error(error.message || "Terjadi kesalahan yang tidak terduga");
    }
  }
}

/**
 * Mengambil detail pengguna berdasarkan ID
 * @param {string|number} userId - ID pengguna
 * @returns {Promise<Object>} - Promise yang resolve dengan data pengguna atau reject dengan error
 */
async function getUserById(userId) {
  try {
    envLog("debug", "Fetching user by ID:", userId);

    const response = await authRequest({
      method: "get",
      url: `${API_CONFIG.BASE_URL}/users/${userId}`,
    });

    if (response.data && response.data.success === true) {
      return response.data.data;
    } else {
      const errorMessage =
        response.data.message || "Gagal mengambil detail pengguna";
      throw new Error(errorMessage);
    }
  } catch (error) {
    envLog("error", "Error fetching user by ID:", error);

    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      if (status === 404) {
        throw new Error("Pengguna tidak ditemukan.");
      } else if (status === 401) {
        throw new Error("Sesi Anda telah berakhir. Silakan login kembali.");
      } else if (status === 403) {
        throw new Error(
          "Anda tidak memiliki akses untuk melihat detail pengguna.",
        );
      } else {
        const message =
          data?.message || `Error ${status}: Gagal mengambil detail pengguna`;
        throw new Error(message);
      }
    } else if (error.request) {
      throw new Error(
        "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.",
      );
    } else {
      throw new Error(error.message || "Terjadi kesalahan yang tidak terduga");
    }
  }
}

/**
 * Update data pengguna berdasarkan ID
 * @param {string|number} userId - ID pengguna
 * @param {FormData} formData - FormData object yang berisi data pengguna yang akan diupdate
 * @returns {Promise<Object>} - Promise yang resolve dengan data pengguna yang diupdate atau reject dengan error
 */
async function updateUser(userId, formData) {
  try {
    envLog("debug", "Updating user:", userId);

    // Debug: log form data contents
    for (let [key, value] of formData.entries()) {
      envLog("debug", `FormData ${key}:`, value);
    }

    const response = await authRequest({
      method: "patch",
      url: `${API_CONFIG.BASE_URL}/users/${userId}`,
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    if (response.data && response.data.success === true) {
      envLog("debug", "Successfully updated user:", response.data.data);
      return response.data.data;
    } else {
      const errorMessage =
        response.data.message || "Gagal mengupdate data pengguna";
      throw new Error(errorMessage);
    }
  } catch (error) {
    envLog("error", "Error updating user:", error);

    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      if (status === 401) {
        throw new Error("Sesi Anda telah berakhir. Silakan login kembali.");
      } else if (status === 403) {
        throw new Error(
          "Anda tidak memiliki akses untuk mengupdate data pengguna.",
        );
      } else if (status === 404) {
        throw new Error("Pengguna tidak ditemukan.");
      } else if (status === 422) {
        throw new Error(data?.message || "Data yang dikirim tidak valid.");
      } else if (status === 500) {
        throw new Error("Terjadi kesalahan server. Silakan coba lagi nanti.");
      } else {
        const message =
          data?.message || `Error ${status}: Gagal mengupdate data pengguna`;
        throw new Error(message);
      }
    } else if (error.request) {
      throw new Error(
        "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.",
      );
    } else {
      throw new Error(error.message || "Terjadi kesalahan yang tidak terduga");
    }
  }
}

/**
 * Hapus pengguna berdasarkan ID
 * @param {string|number} userId - ID pengguna
 * @returns {Promise<Object>} - Promise yang resolve dengan pesan sukses atau reject dengan error
 */
async function deleteUser(userId) {
  try {
    envLog("debug", "Deleting user:", userId);

    const response = await authRequest({
      method: "delete",
      url: `${API_CONFIG.BASE_URL}/users/${userId}`,
    });

    if (response.data && response.data.success === true) {
      envLog("debug", "Successfully deleted user:", userId);
      return response.data;
    } else {
      const errorMessage = response.data.message || "Gagal menghapus pengguna";
      throw new Error(errorMessage);
    }
  } catch (error) {
    envLog("error", "Error deleting user:", error);

    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      if (status === 401) {
        throw new Error("Sesi Anda telah berakhir. Silakan login kembali.");
      } else if (status === 403) {
        throw new Error("Anda tidak memiliki akses untuk menghapus pengguna.");
      } else if (status === 404) {
        throw new Error("Pengguna tidak ditemukan.");
      } else if (status === 500) {
        throw new Error("Terjadi kesalahan server. Silakan coba lagi nanti.");
      } else {
        const message =
          data?.message || `Error ${status}: Gagal menghapus pengguna`;
        throw new Error(message);
      }
    } else if (error.request) {
      throw new Error(
        "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.",
      );
    } else {
      throw new Error(error.message || "Terjadi kesalahan yang tidak terduga");
    }
  }
}

/**
 * Check if email is available (not used by other users)
 * @param {string} email - Email to check
 * @param {string|number} excludeUserId - User ID to exclude from check (for edit mode)
 * @returns {Promise<boolean>} - Promise that resolves to true if email is available
 */
async function checkEmailAvailability(email, excludeUserId = null) {
  try {
    envLog("debug", "Checking email availability:", email);

    // Get all users and check if email exists
    const users = await getUsers();
    const existingUser = users.find(
      (user) =>
        user.email.toLowerCase() === email.toLowerCase() &&
        (!excludeUserId || user.id != excludeUserId),
    );

    return !existingUser; // Return true if email is available (not found)
  } catch (error) {
    envLog("error", "Error checking email availability:", error);
    return true; // If we can't check, assume it's available to avoid blocking
  }
}

/**
 * Check if NIP/NIM is available (not used by other users)
 * @param {string} nipNim - NIP/NIM to check
 * @param {string|number} excludeUserId - User ID to exclude from check (for edit mode)
 * @returns {Promise<boolean>} - Promise that resolves to true if NIP/NIM is available
 */
async function checkNipNimAvailability(nipNim, excludeUserId = null) {
  try {
    envLog("debug", "Checking NIP/NIM availability:", nipNim);

    // Get all users and check if NIP/NIM exists
    const users = await getUsers();
    const existingUser = users.find(
      (user) =>
        (user.nip_nim || user.nipNim) === nipNim &&
        (!excludeUserId || user.id != excludeUserId),
    );

    return !existingUser; // Return true if NIP/NIM is available (not found)
  } catch (error) {
    envLog("error", "Error checking NIP/NIM availability:", error);
    return true; // If we can't check, assume it's available to avoid blocking
  }
}

/**
 * Membuat pengguna baru
 * @param {FormData} formData - FormData object yang sudah berisi semua data pengguna dan file
 * @returns {Promise<Object>} - Promise yang resolve dengan data pengguna baru atau reject dengan error
 */
async function createUser(formData) {
  try {
    envLog("debug", "Creating new user with FormData");

    // Debug: log form data contents
    for (let [key, value] of formData.entries()) {
      envLog("debug", `FormData ${key}:`, value);
    }

    const response = await authRequest({
      method: "post",
      url: `${API_CONFIG.BASE_URL}/users`,
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    if (response.data && response.data.success === true) {
      envLog("debug", "Successfully created user:", response.data.data);
      return response.data.data;
    } else {
      const errorMessage =
        response.data.message || "Gagal membuat pengguna baru";
      throw new Error(errorMessage);
    }
  } catch (error) {
    envLog("error", "Error creating user:", error);

    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      if (status === 401) {
        throw new Error("Sesi Anda telah berakhir. Silakan login kembali.");
      } else if (status === 403) {
        throw new Error("Anda tidak memiliki akses untuk membuat pengguna.");
      } else if (status === 409) {
        // Conflict - Resource already exists
        const message = data?.message || "Data sudah ada di sistem";
        if (message.toLowerCase().includes("email")) {
          throw new Error(
            "Email sudah digunakan oleh user lain. Silakan gunakan email yang berbeda.",
          );
        } else if (
          message.toLowerCase().includes("nip") ||
          message.toLowerCase().includes("nim")
        ) {
          throw new Error(
            "NIP/NIM sudah digunakan oleh user lain. Silakan gunakan NIP/NIM yang berbeda.",
          );
        } else {
          throw new Error(`${message}. Silakan periksa data yang dimasukkan.`);
        }
      } else if (status === 422) {
        const message = data?.message || "Data yang dikirim tidak valid";
        // Check if it's a specific validation error
        if (
          message.toLowerCase().includes("already exists") ||
          message.toLowerCase().includes("sudah ada")
        ) {
          if (message.toLowerCase().includes("email")) {
            throw new Error(
              "Email sudah digunakan oleh user lain. Silakan gunakan email yang berbeda.",
            );
          } else if (
            message.toLowerCase().includes("nip") ||
            message.toLowerCase().includes("nim")
          ) {
            throw new Error(
              "NIP/NIM sudah digunakan oleh user lain. Silakan gunakan NIP/NIM yang berbeda.",
            );
          } else {
            throw new Error(
              `${message}. Silakan periksa data yang dimasukkan.`,
            );
          }
        } else {
          throw new Error(message);
        }
      } else if (status === 500) {
        throw new Error("Terjadi kesalahan server. Silakan coba lagi nanti.");
      } else {
        const message =
          data?.message || `Error ${status}: Gagal membuat pengguna baru`;
        throw new Error(message);
      }
    } else if (error.request) {
      throw new Error(
        "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.",
      );
    } else {
      throw new Error(error.message || "Terjadi kesalahan yang tidak terduga");
    }
  }
}

/**
 * Update data teks pengguna berdasarkan ID (PATCH request dengan JSON)
 * @param {string|number} userId - ID pengguna
 * @param {Object} userData - Data pengguna yang akan diupdate (tanpa file)
 * @returns {Promise<Object>} - Promise yang resolve dengan data pengguna yang diupdate atau reject dengan error
 */
async function updateUserData(userId, userData) {
  try {
    envLog("debug", "Updating user data:", userId, userData);

    // Buat copy dari userData dan hapus password jika kosong
    const dataToSend = { ...userData };
    if (!dataToSend.password || dataToSend.password.trim() === "") {
      delete dataToSend.password;
    }

    // Hapus confirmPassword jika ada
    delete dataToSend.confirmPassword;

    const response = await authRequest({
      method: "patch",
      url: `${API_CONFIG.BASE_URL}/users/${userId}`,
      data: dataToSend,
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.data && response.data.success === true) {
      envLog("debug", "Successfully updated user data:", response.data.data);
      return response.data;
    } else {
      const errorMessage =
        response.data.message || "Gagal mengupdate data pengguna";
      throw new Error(errorMessage);
    }
  } catch (error) {
    envLog("error", "Error updating user data:", error);

    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      if (status === 401) {
        throw new Error("Sesi Anda telah berakhir. Silakan login kembali.");
      } else if (status === 403) {
        throw new Error(
          "Anda tidak memiliki akses untuk mengupdate data pengguna.",
        );
      } else if (status === 404) {
        throw new Error("Pengguna tidak ditemukan.");
      } else if (status === 422) {
        throw new Error(data?.message || "Data yang dikirim tidak valid.");
      } else if (status === 500) {
        throw new Error("Terjadi kesalahan server. Silakan coba lagi nanti.");
      } else {
        const message =
          data?.message || `Error ${status}: Gagal mengupdate data pengguna`;
        throw new Error(message);
      }
    } else if (error.request) {
      throw new Error(
        "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.",
      );
    } else {
      throw new Error(error.message || "Terjadi kesalahan yang tidak terduga");
    }
  }
}

/**
 * Update foto pengguna berdasarkan ID (POST request dengan FormData)
 * @param {string|number} userId - ID pengguna
 * @param {File} photoFile - File foto yang akan diupload
 * @returns {Promise<Object>} - Promise yang resolve dengan data foto baru atau reject dengan error
 */
async function updateUserPhoto(userId, photoFile) {
  try {
    envLog("debug", "Updating user photo:", userId);

    // Validasi file foto terlebih dahulu
    const validation = validatePhotoFile(photoFile);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    const formData = new FormData();
    formData.append("face_photo", photoFile);

    const response = await authRequest({
      method: "post",
      url: `${API_CONFIG.BASE_URL}/users/${userId}/photo`,
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    if (response.data && response.data.success === true) {
      envLog("debug", "Successfully updated user photo:", response.data.data);
      return response.data;
    } else {
      const errorMessage =
        response.data.message || "Gagal mengupdate foto pengguna";
      throw new Error(errorMessage);
    }
  } catch (error) {
    envLog("error", "Error updating user photo:", error);

    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      if (status === 401) {
        throw new Error("Sesi Anda telah berakhir. Silakan login kembali.");
      } else if (status === 403) {
        throw new Error(
          "Anda tidak memiliki akses untuk mengupdate foto pengguna.",
        );
      } else if (status === 404) {
        throw new Error("Pengguna tidak ditemukan.");
      } else if (status === 413) {
        throw new Error("File terlalu besar. Maksimal 20MB.");
      } else if (status === 422) {
        // Gunakan error handler yang lebih spesifik
        const specificError = handlePhotoUploadError(
          new Error(data?.message || ""),
        );
        throw new Error(specificError);
      } else if (status === 500) {
        throw new Error("Terjadi kesalahan server. Silakan coba lagi nanti.");
      } else {
        const message =
          data?.message || `Error ${status}: Gagal mengupdate foto pengguna`;
        throw new Error(message);
      }
    } else if (error.request) {
      throw new Error(
        "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.",
      );
    } else {
      // Gunakan error handler untuk error validation atau lainnya
      const specificError = handlePhotoUploadError(error);
      throw new Error(specificError);
    }
  }
}

/**
 * Mengambil daftar roles dari API dengan caching
 * @returns {Promise<Array>} - Promise yang resolve dengan array roles
 */
async function getRoles() {
  try {
    envLog("debug", "Fetching roles from API");

    // Check cache first
    const cacheKey = "roles_cache";
    const cacheTTL = 5 * 60 * 1000; // 5 minutes
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < cacheTTL) {
        envLog("debug", "Using cached roles data");
        return data;
      }
    }

    const response = await authRequest({
      method: "get",
      url: `${API_CONFIG.BASE_URL}/roles`,
    });
    if (response.data && response.data.success === true) {
      const rawRoles = response.data.data;

      // Map API response to frontend expected structure
      const roles = rawRoles.map((role) => ({
        id: role.id_roles || role.id,
        name: role.role_name || role.name,
      }));

      // Cache the data
      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          data: roles,
          timestamp: Date.now(),
        }),
      );

      envLog("debug", "Successfully fetched roles:", roles);
      return roles;
    } else {
      const errorMessage =
        response.data.message || "Gagal mengambil data roles";
      throw new Error(errorMessage);
    }
  } catch (error) {
    envLog("error", "Error fetching roles:", error);

    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      if (status === 401) {
        throw new Error("Sesi Anda telah berakhir. Silakan login kembali.");
      } else if (status === 403) {
        throw new Error("Anda tidak memiliki akses untuk melihat data roles.");
      } else {
        const message =
          data?.message || `Error ${status}: Gagal mengambil data roles`;
        throw new Error(message);
      }
    } else if (error.request) {
      throw new Error(
        "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.",
      );
    } else {
      throw new Error(error.message || "Terjadi kesalahan yang tidak terduga");
    }
  }
}

/**
 * Mengambil daftar programs dari API dengan caching
 * @returns {Promise<Array>} - Promise yang resolve dengan array programs
 */
async function getPrograms() {
  try {
    envLog("debug", "Fetching programs from API");

    // Check cache first
    const cacheKey = "programs_cache";
    const cacheTTL = 5 * 60 * 1000; // 5 minutes
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < cacheTTL) {
        envLog("debug", "Using cached programs data");
        return data;
      }
    }

    const response = await authRequest({
      method: "get",
      url: `${API_CONFIG.BASE_URL}/programs`,
    });
    if (response.data && response.data.success === true) {
      const rawPrograms = response.data.data;

      // Map API response to frontend expected structure
      const programs = rawPrograms.map((program) => ({
        id: program.id_programs || program.id,
        name: program.program_name || program.name,
      }));

      // Cache the data
      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          data: programs,
          timestamp: Date.now(),
        }),
      );

      envLog("debug", "Successfully fetched programs:", programs);
      return programs;
    } else {
      const errorMessage =
        response.data.message || "Gagal mengambil data programs";
      throw new Error(errorMessage);
    }
  } catch (error) {
    envLog("error", "Error fetching programs:", error);

    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      if (status === 401) {
        throw new Error("Sesi Anda telah berakhir. Silakan login kembali.");
      } else if (status === 403) {
        throw new Error(
          "Anda tidak memiliki akses untuk melihat data programs.",
        );
      } else {
        const message =
          data?.message || `Error ${status}: Gagal mengambil data programs`;
        throw new Error(message);
      }
    } else if (error.request) {
      throw new Error(
        "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.",
      );
    } else {
      throw new Error(error.message || "Terjadi kesalahan yang tidak terduga");
    }
  }
}

/**
 * Mengambil daftar positions berdasarkan program ID dari API
 * @param {string|number} programId - ID program untuk filter positions
 * @returns {Promise<Array>} - Promise yang resolve dengan array positions
 */
async function getPositions(programId = null) {
  try {
    envLog(
      "debug",
      "Fetching positions from API",
      programId ? `for program ${programId}` : "",
    );

    // Build URL with query parameter if programId provided
    const url = new URL(
      `${API_CONFIG.BASE_URL}/positions`,
      window.location.origin,
    );
    if (programId) {
      url.searchParams.append("program_id", programId);
    }

    const response = await authRequest({
      method: "get",
      url: url.toString(),
    });
    if (response.data && response.data.success === true) {
      const rawPositions = response.data.data;

      // Map API response to frontend expected structure
      const positions = rawPositions.map((position) => ({
        id: position.id_positions || position.id,
        name: position.position_name || position.name,
      }));

      envLog("debug", "Successfully fetched positions:", positions);
      return positions;
    } else {
      const errorMessage =
        response.data.message || "Gagal mengambil data positions";
      throw new Error(errorMessage);
    }
  } catch (error) {
    envLog("error", "Error fetching positions:", error);

    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      if (status === 401) {
        throw new Error("Sesi Anda telah berakhir. Silakan login kembali.");
      } else if (status === 403) {
        throw new Error(
          "Anda tidak memiliki akses untuk melihat data positions.",
        );
      } else {
        const message =
          data?.message || `Error ${status}: Gagal mengambil data positions`;
        throw new Error(message);
      }
    } else if (error.request) {
      throw new Error(
        "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.",
      );
    } else {
      throw new Error(error.message || "Terjadi kesalahan yang tidak terduga");
    }
  }
}

/**
 * Mengambil daftar divisions dari API dengan caching
 * @returns {Promise<Array>} - Promise yang resolve dengan array divisions
 */
async function getDivisions() {
  try {
    envLog("debug", "Fetching divisions from API");

    // Check cache first
    const cacheKey = "divisions_cache";
    const cacheTTL = 5 * 60 * 1000; // 5 minutes
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < cacheTTL) {
        envLog("debug", "Using cached divisions data");
        return data;
      }
    }

    const response = await authRequest({
      method: "get",
      url: `${API_CONFIG.BASE_URL}/divisions`,
    });
    if (response.data && response.data.success === true) {
      const rawDivisions = response.data.data;

      // Map API response to frontend expected structure
      const divisions = rawDivisions.map((division) => ({
        id: division.id_divisions || division.id,
        name: division.division_name || division.name,
      }));

      // Cache the data
      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          data: divisions,
          timestamp: Date.now(),
        }),
      );

      envLog("debug", "Successfully fetched divisions:", divisions);
      return divisions;
    } else {
      const errorMessage =
        response.data.message || "Gagal mengambil data divisions";
      throw new Error(errorMessage);
    }
  } catch (error) {
    envLog("error", "Error fetching divisions:", error);

    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      if (status === 401) {
        throw new Error("Sesi Anda telah berakhir. Silakan login kembali.");
      } else if (status === 403) {
        throw new Error(
          "Anda tidak memiliki akses untuk melihat data divisions.",
        );
      } else {
        const message =
          data?.message || `Error ${status}: Gagal mengambil data divisions`;
        throw new Error(message);
      }
    } else if (error.request) {
      throw new Error(
        "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.",
      );
    } else {
      throw new Error(error.message || "Terjadi kesalahan yang tidak terduga");
    }
  }
}

// Export functions
export {
  getUsers,
  getUserById,
  updateUser,
  updateUserData,
  updateUserPhoto,
  deleteUser,
  createUser,
  checkEmailAvailability,
  checkNipNimAvailability,
  getRoles,
  getPrograms,
  getPositions,
  getDivisions,
};
