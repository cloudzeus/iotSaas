import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding iotdgsmart database...");

  // ── Plans ──────────────────────────────────────────────────────────────
  const plans = [
    {
      id: "plan_starter",
      name: "Starter",
      slug: "starter",
      pricePerDevice: 8.0,
      maxDevices: 10,
      features: ["Up to 10 devices", "7-day data retention", "Email alerts", "Basic dashboard"],
    },
    {
      id: "plan_growth",
      name: "Growth",
      slug: "growth",
      pricePerDevice: 7.0,
      maxDevices: 50,
      features: ["Up to 50 devices", "30-day data retention", "Email alerts", "Advanced dashboards", "API access"],
    },
    {
      id: "plan_business",
      name: "Business",
      slug: "business",
      pricePerDevice: 6.0,
      maxDevices: 200,
      features: ["Up to 200 devices", "90-day data retention", "Email & SMS alerts", "Custom dashboards", "API access", "Priority support"],
    },
    {
      id: "plan_enterprise",
      name: "Enterprise",
      slug: "enterprise",
      pricePerDevice: 5.0,
      maxDevices: null,
      features: ["Unlimited devices", "1-year data retention", "All alert channels", "Custom dashboards", "Full API access", "Dedicated support", "SLA guarantee"],
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: plan,
      create: plan,
    });
    console.log(`  ✔ Plan: ${plan.name} (€${plan.pricePerDevice}/device/mo)`);
  }

  // ── Super Admin ────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("ChangeMe123!", 12);
  const superAdmin = await prisma.user.upsert({
    where: { email: "admin@dgsmart.gr" },
    update: {},
    create: {
      email: "admin@dgsmart.gr",
      name: "DGSmart Super Admin",
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      locale: "el",
      theme: "dark",
    },
  });
  console.log(`  ✔ Super admin: ${superAdmin.email}`);

  // ── Demo Tenant ────────────────────────────────────────────────────────
  const demoTenant = await prisma.tenant.upsert({
    where: { slug: "acme-logistics" },
    update: {},
    create: {
      name: "Acme Logistics SA",
      slug: "acme-logistics",
      planId: "plan_growth",
      billingEmail: "billing@acme-logistics.gr",
      afm: "EL123456789",
      address: "Λεωφόρος Αθηνών 45",
      city: "Αθήνα",
      zip: "10431",
    },
  });
  console.log(`  ✔ Demo tenant: ${demoTenant.name}`);

  // ── Demo Customer User ─────────────────────────────────────────────────
  const demoHash = await bcrypt.hash("Demo1234!", 12);
  const demoUser = await prisma.user.upsert({
    where: { email: "demo@acme-logistics.gr" },
    update: {},
    create: {
      email: "demo@acme-logistics.gr",
      name: "Demo Customer",
      passwordHash: demoHash,
      role: UserRole.CUSTOMER,
      tenantId: demoTenant.id,
      locale: "el",
      theme: "dark",
    },
  });
  console.log(`  ✔ Demo customer: ${demoUser.email} / Demo1234!`);

  // ── Demo Dashboard ─────────────────────────────────────────────────────
  await prisma.dashboard.upsert({
    where: { id: "dash_demo_default" },
    update: {},
    create: {
      id: "dash_demo_default",
      tenantId: demoTenant.id,
      name: "Κύριο Dashboard",
      isDefault: true,
      layout: { cols: 12, rowHeight: 60 },
    },
  });
  console.log(`  ✔ Demo dashboard created`);

  console.log("\n✅ Seed complete.");
  console.log("   Super admin → admin@dgsmart.gr / ChangeMe123!");
  console.log("   Demo customer → demo@acme-logistics.gr / Demo1234!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
