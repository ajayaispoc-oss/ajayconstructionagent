
import { TaskConfig, TaskField } from './types';

const COMMON_FIELDS: TaskField[] = [
  { name: 'area_location', label: 'Hyderabad Area', type: 'select', placeholder: 'Select locality', options: ['Madhapur', 'Gachibowli', 'Kukatpally', 'Jubilee Hills', 'Banjara Hills', 'Manikonda', 'Kondapur', 'Ameerpet', 'Uppal', 'Secunderabad'] },
  { name: 'quality_grade', label: 'Finishing Grade', type: 'select', placeholder: 'Select grade', options: ['Budget (Basic)', 'Standard (Regular)', 'Premium (Branded)', 'Luxury (High-end)'] }
];

export const CONSTRUCTION_TASKS: TaskConfig[] = [
  {
    id: 'full_house',
    title: 'Full Project',
    icon: '🏗️',
    description: 'Complete build estimate for a new house or flat finishing.',
    fields: [
      ...COMMON_FIELDS,
      { name: 'project_subtype', label: 'Build Type', type: 'select', placeholder: 'Select type', options: ['Individual House', 'Apartment Flat'] },
      { name: 'totalArea', label: 'Total Area (sq ft)', type: 'number', placeholder: 'e.g., 1500' },
      { 
        name: 'floors', 
        label: 'Number of Floors', 
        type: 'number', 
        placeholder: '1',
        dependsOn: 'project_subtype',
        showIfValue: 'Individual House'
      },
      { 
        name: 'flatStatus', 
        label: 'Current Flat Condition', 
        type: 'select', 
        placeholder: 'Select status', 
        options: ['Bare Shell (Brick walls)', 'Semi-Finished', 'Renovation Only'],
        dependsOn: 'project_subtype',
        showIfValue: 'Apartment Flat'
      }
    ]
  },
  {
    id: 'electrical',
    title: 'Electrical Work',
    icon: '⚡',
    description: 'Wiring and point installation with Goldmedal & Finolex.',
    fields: [
      ...COMMON_FIELDS,
      { 
        name: 'serviceType', 
        label: 'Service Category', 
        type: 'select', 
        placeholder: 'Select service', 
        options: ['New Wiring (Concealed)', 'Surface Wiring', 'Fixture Installation Only'] 
      },
      { name: 'rooms', label: 'Number of Rooms', type: 'number', placeholder: 'e.g., 3' }
    ]
  },
  {
    id: 'painting',
    title: 'Painting Work',
    icon: '🎨',
    description: 'Estimate paint quantity, primer, and labor for walls and ceilings.',
    fields: [
      ...COMMON_FIELDS,
      { name: 'area', label: 'Wall Area (sq ft)', type: 'number', placeholder: 'e.g., 500' },
      { name: 'brandPreference', label: 'Brand Preference', type: 'select', placeholder: 'Select brand', options: ['Asian Paints Royale', 'Birla Opus Style', 'Berger Silk', 'Nerolac Impressions'] }
    ]
  },
  {
    id: 'tiling',
    title: 'Tiles & Flooring',
    icon: '📐',
    description: 'Calculate tiles needed and labor for floor/wall fixing.',
    fields: [
      ...COMMON_FIELDS,
      { name: 'floorArea', label: 'Floor Area (sq ft)', type: 'number', placeholder: 'e.g., 200' },
      { name: 'tileType', label: 'Tile Category', type: 'select', placeholder: 'Select type', options: ['Double Charged Vitrified', 'Italian Marble', 'GVT (Glazed Vitrified)', 'Ceramic Wall Tiles'] }
    ]
  },
  {
    id: 'plumbing',
    title: 'Plumbing & Sanitary',
    icon: '🚰',
    description: 'Pipe installation, fixtures, and drainage planning.',
    fields: [
      ...COMMON_FIELDS,
      { name: 'bathrooms', label: 'Number of Bathrooms', type: 'number', placeholder: 'e.g., 2' }
    ]
  },
  {
    id: 'wall_construction',
    title: 'Wall & Masonry',
    icon: '🧱',
    description: 'Calculate bricks, cement, sand, and labor for walls.',
    fields: [
      ...COMMON_FIELDS,
      { name: 'width', label: 'Width (feet)', type: 'number', placeholder: 'e.g., 10' },
      { name: 'height', label: 'Height (feet)', type: 'number', placeholder: 'e.g., 10' }
    ]
  }
];
