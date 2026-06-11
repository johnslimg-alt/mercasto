import fs from 'fs';
import path from 'path';

const mockDataPath = path.resolve('./src/constants/mockData.js');
let content = fs.readFileSync(mockDataPath, 'utf8');

const exportsToAppend = `
export const spotlightRealEstate = [
  { type: 'BUY', color: 'bg-slate-900', price: '$1,850,000', specs: 'Casa 3 rec • 180m² • Jardín', location: 'Tlaquepaque • 2d ago', img: '/placeholder-ad.svg' },
  { type: 'RENT', color: 'bg-[#84CC16]', price: '$18,500/mo', specs: 'Loft 1 bed • Colonia Roma', location: 'CDMX • 3h ago', img: '/placeholder-ad.svg', badge: { label: 'Urgent', color: 'bg-red-500 text-white' } },
  { type: 'BUY', color: 'bg-slate-900', price: '$4,900,000', specs: 'Penthouse 4 bed • Vista ciudad', location: 'Monterrey • 6h ago', img: '/placeholder-ad.svg', badge: { label: 'Verified', color: 'bg-emerald-100 text-emerald-700' } },
  { type: 'RENT', color: 'bg-[#84CC16]', price: '$12,000/mo', specs: 'Studio amueblado • Providencia', location: 'GDL • 1d ago', img: '/placeholder-ad.svg' }
];

export const jobsBoard = [
  { role: 'Senior React Developer', company: 'Mercasto', salary: '$65k – $85k', loc: 'Remote', logo: 'bg-lime-50 border', initial: 'MD' },
  { role: 'Restaurant Manager', company: 'La Palapa', salary: '$25,000', loc: 'Querétaro', logo: 'bg-amber-100 text-amber-700', initial: 'LP' },
  { role: 'Real Estate Agent', company: 'Century 21', salary: '$20k + Commission', loc: 'Guadalajara', logo: 'bg-blue-100 text-blue-700', initial: 'C21' },
  { role: 'English Teacher', company: 'Harmon Hall', salary: '$18,000', loc: 'Zapopan', logo: 'bg-emerald-100 text-emerald-700', initial: 'HH' },
  { role: 'Delivery Driver', company: 'DiDi', salary: '$15k – $22k', loc: 'Guadalajara', logo: 'bg-purple-100 text-purple-700', initial: 'Di' },
  { role: 'Graphic Designer (Freelance)', company: 'Freelance', salary: '$30,000', loc: 'Remote', logo: 'bg-slate-200', initial: '🎨' },
  { role: 'Barista', company: 'Starbucks', salary: '$12,500', loc: 'Guadalajara', logo: 'bg-green-100 text-green-700', initial: 'SB' },
  { role: 'Plumber - Full Time', company: 'Servicios Pro', salary: '$22,000', loc: 'Zapopan', logo: 'bg-orange-100', initial: '🔧' }
];

export const servicesMarketplace = [
  { title: 'House Cleaning Pro', stars: '4.9 (342)', price: '$450', img: '/placeholder-ad.svg', desc: 'Deep cleaning, apartments & houses. Same-day availability in major cities.', badge: { label: 'Verified', color: 'bg-emerald-100 text-emerald-700' } },
  { title: 'AC Repair 24/7', stars: '4.8 (189)', price: '$650', img: '/placeholder-ad.svg', desc: 'Installation, maintenance, emergency repair. 1yr warranty.', badge: { label: 'Top', color: 'bg-blue-100 text-blue-700' } },
  { title: 'Personal Trainer', stars: '5.0 (97)', price: '$300/hr', img: '/placeholder-ad.svg', desc: 'Home or gym sessions. Weight loss & strength programs.' },
  { title: 'Event Photographer', stars: '4.7 (156)', price: '$2,500', img: '/placeholder-ad.svg', desc: 'Weddings, corporate, real estate. Drone included.', badge: { label: 'Verified', color: 'bg-emerald-100 text-emerald-700' } },
  { title: 'Plumber Expert', stars: '4.9 (423)', price: '$400', img: '/placeholder-ad.svg', desc: 'Leaks, installations, 24h emergency service across Mexico.' },
  { title: 'Web Design Studio', stars: '5.0 (64)', price: '$8,900', img: '/placeholder-ad.svg', desc: 'Landing pages, e-commerce, SEO. 7-day delivery.', badge: { label: 'Top', color: 'bg-blue-100 text-blue-700' } },
  { title: 'Dog Walker & Sitting', stars: '4.9 (201)', price: '$150', img: '/placeholder-ad.svg', desc: 'Daily walks, pet sitting, vet visits. Insured.' },
  { title: 'Electrician Certified', stars: '4.8 (178)', price: '$500', img: '/placeholder-ad.svg', desc: 'Wiring, panels, smart home installation. Licensed.', badge: { label: 'Verified', color: 'bg-emerald-100 text-emerald-700' } }
];

export const automotiveDeals = [
  { price: '$235,000', title: 'Nissan Versa 2021 Advance', specs: '45,000 km • Auto • GDL', img: '/placeholder-ad.svg', badge: { label: 'Verified', color: 'bg-emerald-100 text-emerald-700' } },
  { price: '$289,000', title: 'VW Jetta 2019 Comfortline', specs: '62,300 km • Auto • QRO', img: '/placeholder-ad.svg', badge: { label: 'Top seller', color: 'bg-blue-100 text-blue-700' } },
  { price: '$345,000', title: 'Toyota Corolla 2020 Hybrid', specs: '38,100 km • Hybrid • GDL', img: '/placeholder-ad.svg', badge: { label: 'Verified', color: 'bg-emerald-100 text-emerald-700' } },
  { price: '$285,000', title: 'Honda Civic 2019 Touring', specs: '71,200 km • Auto • Zapopan', img: '/placeholder-ad.svg' },
  { price: '$195,000', title: 'Chevrolet Aveo 2022 LT', specs: '29,500 km • Manual • Puebla', img: '/placeholder-ad.svg', badge: { label: 'New', color: 'bg-[#84CC16] text-white' } },
  { price: '$420,000', title: 'Mazda CX-5 2021 i Sport', specs: '41,000 km • SUV • GDL', img: '/placeholder-ad.svg', badge: { label: 'Verified', color: 'bg-emerald-100 text-emerald-700' } }
];

export const recentlyViewed = [
  { name: 'iPhone 15 Pro', price: '$18,999', img: '/placeholder-ad.svg' },
  { name: '2BR Centro', price: '$32k/mo', img: '/placeholder-ad.svg' },
  { name: 'Yamaha MT-07', price: '$145k', img: '/placeholder-ad.svg' },
  { name: 'MacBook Air M2', price: '$24,500', img: '/placeholder-ad.svg' },
  { name: 'Condo 3 bed', price: '$3.25M', img: '/placeholder-ad.svg' },
  { name: 'Nike Air Max', price: '$1,850', img: '/placeholder-ad.svg' }
];
`;

if (!content.includes('export const spotlightRealEstate')) {
  fs.writeFileSync(mockDataPath, content + '\n' + exportsToAppend, 'utf8');
  console.log("Restored all exports to mockData.js!");
} else {
  console.log("Exports already exist in mockData.js!");
}
