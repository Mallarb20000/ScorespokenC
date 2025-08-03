/**
 * =============================================================================
 * STORAGE INTERFACE
 * =============================================================================
 * 
 * Abstract interface for storage operations.
 * This allows us to easily switch between different storage backends
 * (memory, disk, S3, etc.) without changing the core application logic.
 */

class StorageInterface {
  /**
   * Store a file and return its identifier/path
   * @param {Buffer} fileBuffer - The file data
   * @param {string} filename - Original filename
   * @param {string} mimetype - File MIME type
   * @returns {Promise<string>} - File identifier/path
   */
  async store(fileBuffer, filename, mimetype) {
    throw new Error('store() method must be implemented')
  }

  /**
   * Retrieve a file by its identifier
   * @param {string} identifier - File identifier/path
   * @returns {Promise<Buffer>} - File data
   */
  async retrieve(identifier) {
    throw new Error('retrieve() method must be implemented')
  }

  /**
   * Delete a file by its identifier
   * @param {string} identifier - File identifier/path
   * @returns {Promise<boolean>} - Success status
   */
  async delete(identifier) {
    throw new Error('delete() method must be implemented')
  }

  /**
   * Check if a file exists
   * @param {string} identifier - File identifier/path
   * @returns {Promise<boolean>} - Existence status
   */
  async exists(identifier) {
    throw new Error('exists() method must be implemented')
  }

  /**
   * Get file metadata
   * @param {string} identifier - File identifier/path
   * @returns {Promise<Object>} - File metadata (size, created, etc.)
   */
  async getMetadata(identifier) {
    throw new Error('getMetadata() method must be implemented')
  }

  /**
   * List files (with optional prefix/pattern)
   * @param {string} prefix - Optional prefix to filter files
   * @returns {Promise<Array>} - List of file identifiers
   */
  async list(prefix = '') {
    throw new Error('list() method must be implemented')
  }

  /**
   * Clean up old files (implementation specific)
   * @param {number} maxAge - Maximum age in milliseconds
   * @returns {Promise<number>} - Number of files cleaned up
   */
  async cleanup(maxAge) {
    throw new Error('cleanup() method must be implemented')
  }

  /**
   * Get a public URL for the file (for audio playback)
   * @param {string} identifier - File identifier/path
   * @returns {Promise<string>} - Public URL
   */
  async getPublicUrl(identifier) {
    throw new Error('getPublicUrl() method must be implemented')
  }
}

module.exports = StorageInterface