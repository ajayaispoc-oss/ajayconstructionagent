
import { TaskConfig, TaskField } from './types';

const COMMON_FIELDS: TaskField[] = [
  { name: 'area_location', label: 'Hyderabad Sub-Zone', type: 'select', placeholder: 'Select locality', options: ['Madhapur', 'Gachibowli', 'Kukatpally', 'Jubilee Hills', 'Banjara Hills', 'Manikonda', 'Kondapur', 'Ameerpet', 'Uppal', 'Secunderabad'] },
  { name: 'quality_grade', label: 'Finishing Grade', type: 'select', placeholder: 'Select grade', options: ['Budget (Basic)', 'Standard (Regular)', 'Premium (Branded)', 'Luxury (High-end)'] }
];

export const CONSTRUCTION_TASKS: TaskConfig[] = [
  {
    id: 'full_house',
    title: 'Whole Build',
    icon: '🏗️',
    description: 'Complete build estimate for an Independent House or Flat shell finishing.',
    fields: [
      ...COMMON_FIELDS,
      { name: 'project_subtype', label: 'Build Category', type: 'select', placeholder: 'Select type', options: ['Individual House', 'Apartment Flat'] },
      { name: 'totalArea', label: 'Built-up Area (sq ft)', type: 'number', placeholder: 'e.g., 1800' },
      { 
        name: 'floors', 
        label: 'Number of Floors (G+)', 
        type: 'number', 
        placeholder: '1',
        dependsOn: 'project_subtype',
        showIfValue: 'Individual House'
      },
      { 
        name: 'flatStatus', 
        label: 'Current Shell Status', 
        type: 'select', 
        placeholder: 'Select status', 
        options: ['Bare Brick Shell', 'Plastered Shell', 'Renovation'],
        dependsOn: 'project_subtype',
        showIfValue: 'Apartment Flat'
      }
    ]
  },
  {
    id: 'electrical',
    title: 'Electrical System',
    icon: '⚡',
    description: 'Modular wiring and point design using Goldmedal & Finolex specs.',
    fields: [
      ...COMMON_FIELDS,
      { 
        name: 'serviceType', 
        label: 'Service Category', 
        type: 'select', 
        placeholder: 'Select service', 
        options: ['Concealed Wiring', 'Automation Upgrade', 'Point Installation'] 
      },
      { name: 'rooms', label: 'Number of Rooms', type: 'number', placeholder: 'e.g., 3' }
    ]
  },
  {
    id: 'painting',
    title: 'Paint & Finishes',
    icon: '🎨',
    description: 'Wall preparation, primer, and luxury paint application.',
    fields: [
      ...COMMON_FIELDS,
      { name: 'area', label: 'Wall Surface Area (sq ft)', type: 'number', placeholder: 'e.g., 1200' },
      { name: 'brandPreference', label: 'Paint Range', type: 'select', placeholder: 'Select range', options: ['Royale Luxury', 'Apex Ultima', 'Silk Glamor', 'Budget Distemper'] }
    ]
  },
  {
    id: 'tiling',
    title: 'Flooring & Tiling',
    icon: '📐',
    description: 'Vitrified tiles, Italian marble, or granite installation.',
    fields: [
      ...COMMON_FIELDS,
      { name: 'floorArea', label: 'Floor Area (sq ft)', type: 'number', placeholder: 'e.g., 800' },
      { name: 'tileType', label: 'Material Category', type: 'select', placeholder: 'Select material', options: ['Double Charge Vitrified', 'Italian Marble (Raw)', 'Granite Slabs', 'Wooden Planks'] }
    ]
  },
  {
    id: 'plumbing',
    title: 'Sanitary & Utility',
    icon: '🚰',
    description: 'CPVC piping, drainage, and premium bathroom fixtures.',
    fields: [
      ...COMMON_FIELDS,
      { name: 'bathrooms', label: 'No. of Toilets/Kitchens', type: 'number', placeholder: 'e.g., 3' }
    ]
  },
  {
    id: 'wall_construction',
    title: 'Brickwork & Masonry',
    icon: '🧱',
    description: 'Traditional red brick or modern AAC block wall builds.',
    fields: [
      ...COMMON_FIELDS,
      { name: 'width', label: 'Total Length (ft)', type: 'number', placeholder: 'e.g., 40' },
      { name: 'height', label: 'Height (ft)', type: 'number', placeholder: '10' }
    ]
  }
];
