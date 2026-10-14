export const loadComponent = async (elementId, filePath) => {
  try {
    const response = await fetch(filePath);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const html = await response.text();
    const container = document.getElementById(elementId);
    if (container) {
      container.innerHTML = html;
    }
  } catch (error) {
    console.error('Gagal memuat komponen:', filePath, error);
  }
};