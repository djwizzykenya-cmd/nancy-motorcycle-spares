export interface LocalProduct {
  id: string;
  name: string;
  price: number;
  images: string[];
  seller: { shopName: string };
  category: string;
  description: string;
  stock: number;
}

export const products: LocalProduct[] = [
  {
    id: "p1",
    name: "Motorcycle Engine Piston",
    price: 4500,
    images: ["https://images.pexels.com/photos/159898/pexels-photo-159898.jpeg"],
    seller: { shopName: "Nancy Motorcycle Spares" },
    category: "Engine Parts",
    description: "A durable engine piston designed for high performance and long service life.",
    stock: 8
  },
  {
    id: "p2",
    name: "Front Brake Disc",
    price: 3200,
    images: ["https://images.pexels.com/photos/163634/pexels-photo-163634.jpeg"],
    seller: { shopName: "Nancy Motorcycle Spares" },
    category: "Brakes",
    description: "Precision-machined brake disc for consistent stopping power.",
    stock: 12
  },
  {
    id: "p3",
    name: "LED Headlight",
    price: 2400,
    images: ["https://images.pexels.com/photos/358070/pexels-photo-358070.jpeg"],
    seller: { shopName: "Nancy Motorcycle Spares" },
    category: "Lights",
    description: "Bright, energy-efficient LED headlight for safer night riding.",
    stock: 5
  },
  {
    id: "p4",
    name: "Shock Absorber (Rear)",
    price: 5200,
    images: ["https://images.pexels.com/photos/210019/pexels-photo-210019.jpeg"],
    seller: { shopName: "Nancy Motorcycle Spares" },
    category: "Suspension",
    description: "Heavy-duty rear shock absorber built for comfort and control.",
    stock: 6
  },
  {
    id: "p5",
    name: "Spark Plug Set",
    price: 900,
    images: ["https://images.pexels.com/photos/163636/pexels-photo-163636.jpeg"],
    seller: { shopName: "Nancy Motorcycle Spares" },
    category: "Electrical",
    description: "Reliable spark plug set for crisp ignition and better fuel economy.",
    stock: 25
  },
  {
    id: "p6",
    name: "Motorcycle Tire 17in",
    price: 6800,
    images: ["https://images.pexels.com/photos/210019/pexels-photo-210019.jpeg"],
    seller: { shopName: "Nancy Motorcycle Spares" },
    category: "Tires & Wheels",
    description: "High-traction 17-inch tire for great grip and long wear.",
    stock: 14
  },
  {
    id: "p7",
    name: "Clutch Cable",
    price: 700,
    images: ["https://images.pexels.com/photos/175605/pexels-photo-175605.jpeg"],
    seller: { shopName: "Nancy Motorcycle Spares" },
    category: "Transmission",
    description: "Flexible and durable clutch cable for smooth shifting.",
    stock: 30
  },
  {
    id: "p8",
    name: "Handle Grip Set",
    price: 350,
    images: ["https://images.pexels.com/photos/163636/pexels-photo-163636.jpeg"],
    seller: { shopName: "Nancy Motorcycle Spares" },
    category: "Accessories",
    description: "Comfortable handle grips with extra traction for every ride.",
    stock: 18
  },
  {
    id: "p9",
    name: "Chain Kit",
    price: 1200,
    images: ["https://images.pexels.com/photos/210019/pexels-photo-210019.jpeg"],
    seller: { shopName: "Nancy Motorcycle Spares" },
    category: "Transmission",
    description: "Complete chain kit for reliable power transfer and low maintenance.",
    stock: 20
  },
  {
    id: "fallback-1",
    name: "Brake Disc Set",
    price: 6500,
    images: ["/placeholder-product.svg"],
    seller: { shopName: "Nancy Motorcycle Spares" },
    category: "Brakes",
    description: "A complete brake disc set for smooth, reliable stopping performance.",
    stock: 7
  },
  {
    id: "fallback-2",
    name: "Engine Oil Filter",
    price: 1800,
    images: ["/placeholder-product.svg"],
    seller: { shopName: "Nancy Motorcycle Spares" },
    category: "Engine Parts",
    description: "High-quality oil filter that keeps your engine clean and protected.",
    stock: 14
  },
  {
    id: "fallback-3",
    name: "Suspension Shock Absorber",
    price: 9200,
    images: ["/placeholder-product.svg"],
    seller: { shopName: "Nancy Motorcycle Spares" },
    category: "Suspension",
    description: "Heavy-duty rear shock absorber built for stable handling and smooth rides.",
    stock: 6
  },
  {
    id: "fallback-4",
    name: "LED Headlight Unit",
    price: 5400,
    images: ["/placeholder-product.svg"],
    seller: { shopName: "Nancy Motorcycle Spares" },
    category: "Electrical",
    description: "Durable LED headlight unit for better visibility during night rides.",
    stock: 5
  }
];
