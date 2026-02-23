
export type ConstructionCategory = 
  | 'wall_construction' 
  | 'painting' 
  | 'tiling' 
  | 'electrical' 
  | 'sanitary_kitchen' 
  | 'full_house';

export type HyderabadArea = 
  | 'Madhapur' | 'Gachibowli' | 'Kukatpally' | 'Jubilee Hills' | 'Banjara Hills' 
  | 'Manikonda' | 'Kondapur' | 'Ameerpet' | 'Uppal' | 'Secunderabad';

export type QualityGrade = 'Budget' | 'Standard' | 'Premium' | 'Luxury';
export type ProjectSubtype = 'House' | 'Flat';

export interface UserData {
  name: string;
  phone: string;
  email: string;
  // Added location to support area-specific estimation logic
  location?: string;
  company?: string;
}

export interface MaterialItem {
  name: string;
  quantity: string;
  unitPrice: number;
  totalPrice: number;
  brandSuggestion?: string;
}

export interface TimelineEvent {
  week: number;
  activity: string;
  status: 'pending' | 'in-progress' | 'completed';
}

export interface EstimationResult {
  category: ConstructionCategory;
  materials: MaterialItem[];
  laborCost: number;
  estimatedDays: number;
  precautions: string[];
  totalEstimatedCost: number;
  expertTips: string;
  visualPrompt: string;
  timeline?: TimelineEvent[];
  paintCodeSuggestions?: string[];
}

export interface TaskField {
  name: string;
  label: string;
  type: 'number' | 'text' | 'select';
  placeholder: string;
  options?: string[];
  dependsOn?: string;
  showIfValue?: string | string[];
}

export interface TaskConfig {
  id: ConstructionCategory;
  title: string;
  icon: string;
  description: string;
  fields: TaskField[];
}

export interface MarketMaterial {
  category: string;
  brandName: string;
  specificType: string;
  priceWithGst: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
}

export interface MarketPriceList {
  lastUpdated: string;
  categories: {
    title: string;
    items: MarketMaterial[];
  }[];
}
