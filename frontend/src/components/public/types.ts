export type PublicProduct = {
  id: number;
  sku: string;
  name: string;
  name_ar?: string;
  name_fr?: string;
  category?: string;
  base_unit: string;
  price: string;
  image_url?: string;
};

export type CartLine = PublicProduct & { qty: number };

export type PublicCustomer = {
  name: string;
  phone: string;
  city: string;
  address: string;
  note: string;
};

export const productLabel = (p: { name_ar?: string; name: string }) => p.name_ar || p.name;
