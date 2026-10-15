import prisma from "../prisma";

async function main() {
  const existing = await prisma.category.findMany();
  if (existing.length === 0) {
    const categories = [
      { name: "Engine Parts", slug: "engine-parts" },
      { name: "Transmission", slug: "transmission" },
      { name: "Suspension", slug: "suspension" },
      { name: "Brakes", slug: "brakes" },
      { name: "Electrical", slug: "electrical" },
      { name: "Tires & Wheels", slug: "tires-wheels" },
      { name: "Lights", slug: "lights" },
      { name: "Accessories", slug: "accessories" }
    ];

    await prisma.category.createMany({ data: categories });
    console.log("Seeded categories.");
  } else {
    console.log("Categories already seeded.");
  }

  // Seed sample products under the administrator's store, never a seller account.
  const prodCount = await prisma.product.count();
  if (prodCount === 0) {
    const adminUser = await prisma.user.findFirst({
      where: { userType: "admin" },
      orderBy: { createdAt: "asc" }
    });

    if (!adminUser) {
      console.warn("No admin account found; skipped sample products. Provision an admin and rerun the seed.");
      return;
    }

    const seller = await prisma.seller.upsert({
      where: { userId: adminUser.id },
      create: {
        user: { connect: { id: adminUser.id } },
        shopName: "Nancy Motorcycle Spares",
        shopDescription: "Official Nancy Motorcycle Spares store",
        commissionRate: 0,
        isApproved: true,
        isVerified: true,
        totalRevenue: 0
      },
      update: {
        shopName: "Nancy Motorcycle Spares",
        isApproved: true,
        isVerified: true
      }
    });

    const categoriesMap = await prisma.category.findMany();
    const catBySlug: Record<string, string> = {};
    categoriesMap.forEach((c) => (catBySlug[c.slug] = c.id));

    const sampleProducts = [
      {
        name: "Motorcycle Engine Piston",
        description: "High performance piston compatible with many models.",
        categorySlug: "engine-parts",
        price: 4500,
        stock: 12,
        images: [
          "https://images.pexels.com/photos/159898/pexels-photo-159898.jpeg"
        ]
      },
      {
        name: "Front Brake Disc",
        description: "Durable front brake disc for improved stopping power.",
        categorySlug: "brakes",
        price: 3200,
        stock: 20,
        images: ["https://images.pexels.com/photos/163634/pexels-photo-163634.jpeg"]
      },
      {
        name: "LED Headlight",
        description: "Bright LED headlight with long lifespan.",
        categorySlug: "lights",
        price: 2400,
        stock: 30,
        images: ["https://images.pexels.com/photos/358070/pexels-photo-358070.jpeg"]
      },
      {
        name: "Shock Absorber (Rear)",
        description: "Comfortable ride with these premium shock absorbers.",
        categorySlug: "suspension",
        price: 5200,
        stock: 8,
        images: ["https://images.pexels.com/photos/210019/pexels-photo-210019.jpeg"]
      },
      {
        name: "Spark Plug Set",
        description: "Reliable spark plugs for better ignition.",
        categorySlug: "electrical",
        price: 900,
        stock: 50,
        images: ["https://images.pexels.com/photos/163636/pexels-photo-163636.jpeg"]
      },
      {
        name: "Motorcycle Tire 17in",
        description: "All-weather tire with excellent grip.",
        categorySlug: "tires-wheels",
        price: 6800,
        stock: 14,
        images: ["https://images.pexels.com/photos/210019/pexels-photo-210019.jpeg"]
      }
    ];

    for (const p of sampleProducts) {
      await prisma.product.create({
        data: {
          sellerId: seller.id,
          name: p.name,
          description: p.description,
          categoryId: catBySlug[p.categorySlug] || categoriesMap[0].id,
          price: p.price,
          stock: p.stock,
          images: JSON.stringify(p.images),
          isActive: true
        }
      });
    }

    console.log("Seeded sample products under the administrator's store.");
  } else {
    console.log("Products already seeded.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
