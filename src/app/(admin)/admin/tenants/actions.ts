"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { fetchAfmInfo, type AfmInfo, type AfmKad } from "@/lib/afm";
import { revalidatePath } from "next/cache";

export async function lookupAfmAction(afm: string): Promise<AfmInfo> {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  return fetchAfmInfo(afm);
}

interface SaveInput {
  id?: string;
  form: {
    afm: string; code: string; name: string; sotitle: string;
    isprosp: number; country: string; address: string; zip: string;
    district: string; city: string; area: string; latitude: string; longitude: string;
    phone01: string; phone02: string; jobtype: string; jobtypetrd: string;
    trdpgroup: string; webpage: string; email: string; emailacc: string;
    trdbusiness: string; irsdata: string; consent: boolean; prjcs: string;
    remark: string; registrationDate: string; numberOfEmployees: string; gemiCode: string;
  };
  kads: AfmKad[];
}

const str = (s: string) => (s.trim() ? s.trim() : null);
const num = (s: string) => (s.trim() ? Number(s) : null);

function slugify(s: string) {
  return s.toLowerCase().trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || `tenant-${Date.now()}`;
}

export async function saveAfmTenantAction(input: SaveInput): Promise<{ id: string }> {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const f = input.form;
  if (!f.afm || f.afm.length !== 9) throw new Error("Μη έγκυρο ΑΦΜ");

  const data = {
    afm: f.afm,
    code: str(f.code),
    name: str(f.name) ?? `ΑΦΜ ${f.afm}`,
    sotitle: str(f.sotitle),
    isprosp: f.isprosp,
    country: num(f.country),
    address: str(f.address),
    zip: str(f.zip),
    district: str(f.district),
    city: str(f.city),
    area: str(f.area),
    latitude: num(f.latitude),
    longitude: num(f.longitude),
    phone01: str(f.phone01),
    phone02: str(f.phone02),
    jobtype: num(f.jobtype),
    jobtypetrd: str(f.jobtypetrd),
    trdpgroup: num(f.trdpgroup),
    webpage: str(f.webpage),
    email: str(f.email),
    emailacc: str(f.emailacc),
    trdbusiness: num(f.trdbusiness),
    irsdata: str(f.irsdata),
    consent: f.consent,
    prjcs: num(f.prjcs),
    remark: str(f.remark),
    registrationDate: f.registrationDate ? new Date(f.registrationDate) : null,
    numberOfEmployees: num(f.numberOfEmployees),
    gemiCode: str(f.gemiCode),
    billingEmail: str(f.email),
  };

  let tenant;
  if (input.id) {
    tenant = await db.tenant.update({ where: { id: input.id }, data });
  } else {
    const existing = await db.tenant.findFirst({ where: { afm: f.afm } });
    if (existing) {
      tenant = await db.tenant.update({ where: { id: existing.id }, data });
    } else {
      // Generate a unique slug
      const baseSlug = slugify(data.name);
      let slug = baseSlug;
      let n = 1;
      while (await db.tenant.findUnique({ where: { slug } })) {
        slug = `${baseSlug}-${++n}`;
      }
      tenant = await db.tenant.create({ data: { ...data, slug } });
    }
  }

  for (const k of input.kads) {
    await db.companyKad.upsert({
      where: { tenantId_kadCode: { tenantId: tenant.id, kadCode: k.firm_act_code } },
      update: { kadDescription: k.firm_act_descr, kadType: k.firm_act_kind },
      create: {
        tenantId: tenant.id,
        kadCode: k.firm_act_code,
        kadDescription: k.firm_act_descr,
        kadType: k.firm_act_kind,
      },
    });
  }

  revalidatePath("/admin/tenants");
  return { id: tenant.id };
}

export async function deleteTenantAction(id: string): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  await db.tenant.delete({ where: { id } });
  revalidatePath("/admin/tenants");
}
