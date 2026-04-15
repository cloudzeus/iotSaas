export interface AfmKad {
  firm_act_code: string;
  firm_act_descr: string;
  firm_act_kind: string;
  firm_act_kind_descr: string;
}

export interface AfmInfo {
  basic_rec: {
    afm: string;
    doy?: string;
    doy_descr?: string;
    onomasia?: string;
    commer_title?: string;
    legal_status_descr?: string;
    postal_address?: string;
    postal_address_no?: string;
    postal_zip_code?: string;
    postal_area_description?: string;
    regist_date?: string;
    deactivation_flag?: string;
    deactivation_flag_descr?: string;
    firm_flag_descr?: string;
    normal_vat_system_flag?: string;
    [k: string]: unknown;
  };
  firm_act_tab?: { item?: AfmKad | AfmKad[] };
}

export async function fetchAfmInfo(afm: string): Promise<AfmInfo> {
  const cleaned = afm.replace(/\D/g, "");
  if (cleaned.length !== 9) throw new Error("Το ΑΦΜ πρέπει να είναι 9 ψηφία");

  const res = await fetch("https://vat.wwa.gr/afm2info", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ afm: cleaned }),
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`AFM lookup failed (${res.status})`);
  const data = (await res.json()) as AfmInfo;
  if (!data.basic_rec?.afm) throw new Error("Δεν βρέθηκαν στοιχεία για το ΑΦΜ");
  return data;
}

export function kadList(info: AfmInfo): AfmKad[] {
  const item = info.firm_act_tab?.item;
  if (!item) return [];
  return Array.isArray(item) ? item : [item];
}

// Mapping: AADE / vat.wwa.gr response → Customer model fields
export interface CustomerMapped {
  afm: string;
  name: string | null;          // ← onomasia
  sotitle: string | null;       // ← commer_title
  address: string | null;       // ← postal_address + postal_address_no
  zip: string | null;           // ← postal_zip_code
  city: string | null;          // ← postal_area_description
  irsdata: string | null;       // ← doy_descr (ΔΟΥ)
  registrationDate: Date | null; // ← regist_date
}

export function mapAfmToCustomer(info: AfmInfo): CustomerMapped {
  const b = info.basic_rec;
  const street = [b.postal_address, b.postal_address_no].filter(Boolean).join(" ").trim();
  return {
    afm: b.afm,
    name: b.onomasia ?? null,
    sotitle: b.commer_title ?? null,
    address: street || null,
    zip: b.postal_zip_code ?? null,
    city: b.postal_area_description ?? null,
    irsdata: b.doy_descr ?? null,
    registrationDate: b.regist_date ? new Date(b.regist_date) : null,
  };
}

export interface KadMapped {
  kadCode: string;        // ← firm_act_code
  kadDescription: string; // ← firm_act_descr
  kadType: string;        // ← firm_act_kind ("1"=ΚΥΡΙΑ, "2"=ΔΕΥΤΕΡΕΥΟΥΣΑ)
}

export function mapAfmToKads(info: AfmInfo): KadMapped[] {
  return kadList(info).map((k) => ({
    kadCode: k.firm_act_code,
    kadDescription: k.firm_act_descr,
    kadType: k.firm_act_kind,
  }));
}
