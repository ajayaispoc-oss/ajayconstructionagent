
import { TaskConfig, TaskField } from './types';

const COMMON_FIELDS: TaskField[] = [
  { name: 'clientName', label: 'Your Full Name', type: 'text', placeholder: 'e.g., Ajay Kumar' },
  { name: 'clientPhone', label: 'Client Mobile Number', type: 'text', placeholder: 'e.g., 97031XXXXX' },
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
    description: 'Wall preparation, primer, and professional paint application from top brands.',
    fields: [
      ...COMMON_FIELDS,
      { name: 'area', label: 'Wall Surface Area (sq ft)', type: 'number', placeholder: 'e.g., 1200' },
      { 
        name: 'paint_company', 
        label: 'Paint Brand', 
        type: 'select', 
        placeholder: 'Select Brand', 
        options: ['Asian Paints', 'Birla Opus', 'Berger Paints', 'Dulux'] 
      },
      { 
        name: 'paint_type_asian', 
        label: 'Asian Paints Range', 
        type: 'select', 
        placeholder: 'Select Range', 
        options: ['Royale Luxury Emulsion', 'Apex Ultima Protective', 'Tractor Emulsion (Budget)', 'Nilaya Wallcoverings'],
        dependsOn: 'paint_company',
        showIfValue: 'Asian Paints'
      },
      { 
        name: 'paint_type_birla', 
        label: 'Birla Opus Range', 
        type: 'select', 
        placeholder: 'Select Range', 
        options: ['Allure Luxury', 'Prime High-Gloss', 'Calista Interior', 'Style Distemper'],
        dependsOn: 'paint_company',
        showIfValue: 'Birla Opus'
      },
      { 
        name: 'paint_type_berger', 
        label: 'Berger Paints Range', 
        type: 'select', 
        placeholder: 'Select Range', 
        options: ['Silk Glamor', 'Weathercoat Long Life', 'Luxol High Gloss', 'Bison Emulsion'],
        dependsOn: 'paint_company',
        showIfValue: 'Berger Paints'
      },
      { 
        name: 'paint_type_dulux', 
        label: 'Dulux Range', 
        type: 'select', 
        placeholder: 'Select Range', 
        options: ['Velvet Touch', 'Weathershield Max', 'Promise Emulsion', 'Supercover'],
        dependsOn: 'paint_company',
        showIfValue: 'Dulux'
      }
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
    id: 'sanitary_kitchen',
    title: 'Sanitary & Kitchen',
    icon: '🚰',
    description: 'Plumbing, fixture installation, and modular kitchen utility setups.',
    fields: [
      ...COMMON_FIELDS,
      { 
        name: 'work_scope', 
        label: 'Service Scope', 
        type: 'select', 
        placeholder: 'Select work area', 
        options: ['Bathrooms Only', 'Kitchen Only', 'Both Bathroom & Kitchen'] 
      },
      { 
        name: 'bathrooms', 
        label: 'Number of Bathrooms', 
        type: 'number', 
        placeholder: 'e.g., 2',
        dependsOn: 'work_scope',
        showIfValue: ['Bathrooms Only', 'Both Bathroom & Kitchen']
      },
      { 
        name: 'pipeline_status', 
        label: 'Pipeline Status', 
        type: 'select', 
        placeholder: 'Select status', 
        options: ['Already Installed (Fixture Only)', 'Need New Pipeline Installation'],
        dependsOn: 'work_scope',
        showIfValue: ['Bathrooms Only', 'Both Bathroom & Kitchen']
      },
      { 
        name: 'kitchen_width', 
        label: 'Kitchen Width (ft)', 
        type: 'number', 
        placeholder: 'e.g., 10',
        dependsOn: 'work_scope',
        showIfValue: ['Kitchen Only', 'Both Bathroom & Kitchen']
      },
      { 
        name: 'kitchen_height', 
        label: 'Kitchen Height (ft)', 
        type: 'number', 
        placeholder: 'e.g., 9',
        dependsOn: 'work_scope',
        showIfValue: ['Kitchen Only', 'Both Bathroom & Kitchen']
      }
    ]
  },
  {
    id: 'wall_construction',
    title: 'Brickwork & Masonry',
    icon: '🧱',
    description: 'Traditional red brick, modern AAC block, or cement brick wall builds.',
    fields: [
      ...COMMON_FIELDS,
      { 
        name: 'brick_type', 
        label: 'Brick/Block Material', 
        type: 'select', 
        placeholder: 'Select Brick Type', 
        options: ['Table Molded Red Bricks', 'Wire Cut Red Bricks', 'Solid Cement Bricks', 'Fly Ash Bricks', 'AAC Blocks (Lightweight)'] 
      },
      { 
        name: 'wall_thickness', 
        label: 'Wall Thickness', 
        type: 'select', 
        placeholder: 'Select Thickness', 
        options: ['9 inch (External)', '4.5 inch (Internal Partition)', '6 inch (AAC Standard)'] 
      },
      { name: 'width', label: 'Total Wall Length (ft)', type: 'number', placeholder: 'e.g., 40' },
      { name: 'height', label: 'Wall Height (ft)', type: 'number', placeholder: 'e.g., 10' }
    ]
  }
];
