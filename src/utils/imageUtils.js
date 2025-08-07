// utils/imageUtils.js
export const getFullUrl = (path) => {
  const DEFAULT_IMAGE = 'https://f003.backblazeb2.com/file/gogo-digital-media/shop_images/default/shop_default.jpg';
  if (!path || path === '') return DEFAULT_IMAGE;
  // If the path is already a full URL (starts with http), use it directly
  if (path.startsWith('http')) return path;
  // For relative paths (e.g., 'shop_images/...'), prepend B2 base URL
  return `https://f003.backblazeb2.com/file/gogo-digital-media/${path}`;
};