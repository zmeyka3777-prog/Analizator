import { Product } from '@/types/product.types';
import { PRODUCTS as DEFAULT_PRODUCTS } from './salesData';

const STORAGE_KEY = 'world_medicine_products';
const DRAFT_STORAGE_KEY = 'world_medicine_products_draft';

export function getAllProducts(): Product[] {
  if (typeof window === 'undefined') return DEFAULT_PRODUCTS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) { console.error('Error loading products:', e); }
  return DEFAULT_PRODUCTS;
}

export function getProductsDraft(): Product[] {
  if (typeof window === 'undefined') return getAllProducts();
  try {
    const stored = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) { console.error('Error loading products draft:', e); }
  return getAllProducts();
}

export function saveAllProducts(products: Product[]): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(products)); } catch (e) { console.error('Error saving products:', e); }
}

export function saveProductsDraft(products: Product[]): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(products)); } catch (e) { console.error('Error saving products draft:', e); }
}

export function publishProductsDraft(): boolean {
  if (typeof window === 'undefined') return false;
  try { const draft = getProductsDraft(); saveAllProducts(draft); return true; } catch (e) { console.error('Error publishing products draft:', e); return false; }
}

export function hasUnpublishedProductChanges(): boolean {
  if (typeof window === 'undefined') return false;
  try { return JSON.stringify(getAllProducts()) !== JSON.stringify(getProductsDraft()); } catch (e) { return false; }
}

export function addProduct(product: Omit<Product, 'id'> & { id?: string }): Product {
  const products = getProductsDraft();
  const newProduct: Product = { ...product, id: product.id || `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` } as Product;
  products.push(newProduct);
  saveProductsDraft(products);
  return newProduct;
}

export function updateProduct(id: string, updates: Partial<Product>): Product | null {
  const products = getProductsDraft();
  const index = products.findIndex(p => p.id === id);
  if (index === -1) return null;
  products[index] = { ...products[index], ...updates };
  saveProductsDraft(products);
  return products[index];
}

export function deleteProduct(id: string): boolean {
  const products = getProductsDraft();
  const filtered = products.filter(p => p.id !== id);
  if (filtered.length === products.length) return false;
  saveProductsDraft(filtered);
  return true;
}

export function getProductById(id: string): Product | null {
  return getAllProducts().find(p => p.id === id) || null;
}

export function restoreDefaultProduct(productId: string): boolean {
  const defaultProduct = DEFAULT_PRODUCTS.find(p => p.id === productId);
  if (!defaultProduct) return false;
  const products = getProductsDraft();
  const existingIndex = products.findIndex(p => p.id === productId);
  if (existingIndex !== -1) { products[existingIndex] = { ...defaultProduct }; }
  else { products.push({ ...defaultProduct }); }
  saveProductsDraft(products);
  return true;
}

export function resetToDefault(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(DRAFT_STORAGE_KEY);
}
