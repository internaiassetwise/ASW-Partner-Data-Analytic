"use client";

import { FileText, MapPin, Building, Globe, Phone, Mail, User, ExternalLink, X, Building2 } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  partner: "ASW Partner", sponsor: "Sponsor", bank: "Bank",
  external_org: "องค์กรภายนอก", partner_2026: "พาร์ทเนอร์ 2026",
  gov_bkk: "หน่วยงาน กทม.", gov_district: "สำนักงานเขต",
};
const TYPE_COLORS: Record<string, string> = {
  partner: "#378ADD", sponsor: "#D85A30", bank: "#1D9E75",
  external_org: "#F59E0B", partner_2026: "#06B6D4",
  gov_bkk: "#9CA3AF", gov_district: "#6B7280",
};
const NAVY = "#1e3a5f";

interface LinkedPartner { name: string; entity_type: string; phone: string; email: string; admin_zone: string; }

function Icon({ icon: Icon, label, value, bold }: { icon: any; label: string; value: string; bold?: boolean }) {
  return (
    <p className="flex items-center gap-2 text-[13px] text-gray-600">
      <Icon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
      {label} {bold ? <b>{value}</b> : value}
    </p>
  );
}

export default function DetailPanel({
  selected, linkedPartners, onClose,
}: {
  selected: Record<string, any> | null;
  linkedPartners: LinkedPartner[];
  onClose: () => void;
}) {
  if (!selected) return null;
  const isProject = selected.isProject;

  return (
    <div className="absolute top-0 right-0 bottom-0 w-80 bg-white border-l border-gray-200 shadow-lg z-[600] overflow-y-auto">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b" style={{ background: isProject ? "#e8eef5" : "#f9fafb", borderColor: isProject ? "#c3d4e8" : "#f3f4f6" }}>
        <h3 className="font-semibold text-sm flex items-center gap-1.5" style={{ color: isProject ? NAVY : "#374151" }}>
          {isProject ? <Building2 className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
          {isProject ? "รายละเอียดโครงการ" : "รายละเอียดพาร์ทเนอร์"}
        </h3>
        <button onClick={onClose} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded hover:bg-gray-200">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-4 py-3 space-y-3 text-sm">
        {/* Name */}
        <div>
          <p className="font-semibold text-base text-gray-900">{selected.name}</p>
          {!isProject ? (
            <span className="inline-flex items-center gap-1.5 mt-1 text-[11px] px-2 py-0.5 rounded-full" style={{ background: `${TYPE_COLORS[selected.entity_type] || "#666"}20`, color: TYPE_COLORS[selected.entity_type] || "#666" }}>
              <span className="w-2 h-2 rounded-full" style={{ background: TYPE_COLORS[selected.entity_type] || "#666" }} />
              {TYPE_LABELS[selected.entity_type] || selected.entity_type}
            </span>
          ) : (
            selected.status && <span className="inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full" style={{ background: "#e8eef5", color: NAVY }}>{selected.status}</span>
          )}
        </div>

        {/* Location */}
        <div className="space-y-1.5">
          {!isProject ? (
            <>
              {selected.admin_zone && <Icon icon={MapPin} label="เขต/อำเภอ:" value={selected.admin_zone} bold />}
              {selected.subzone && <Icon icon={Building} label="แขวง/ตำบล:" value={selected.subzone} />}
              {selected.province && <Icon icon={Globe} label="จังหวัด:" value={selected.province} bold />}
            </>
          ) : (
            <>
              {selected.zone && <Icon icon={MapPin} label="โซน:" value={selected.zone} bold />}
              {selected.admin_zone && <Icon icon={Building} label="เขต:" value={selected.admin_zone} />}
              {selected.province && <Icon icon={Globe} label="จังหวัด:" value={selected.province} />}
            </>
          )}
        </div>

        {/* Google Maps */}
        {selected.lat && selected.lng && (
          <a href={`https://www.google.com/maps/search/?api=1&query=${selected.lat},${selected.lng}`} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1.5 rounded-lg transition border w-fit"
            style={{ background: "#ebf5ff", color: "#378ADD", borderColor: "#bfdbfe" }}>
            <ExternalLink className="w-3.5 h-3.5" /> เปิดใน Google Maps
          </a>
        )}

        {/* Contact */}
        {!isProject && (selected.phone || selected.email || selected.contact_name) && (
          <>
            <div className="h-px bg-gray-100" />
            <div className="space-y-1.5">
              {selected.phone && <Icon icon={Phone} label="" value={selected.phone} />}
              {selected.email && <p className="flex items-center gap-2 text-[13px] text-gray-600 break-all"><Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" /> {selected.email}</p>}
              {selected.contact_name && <Icon icon={User} label="" value={selected.contact_name} />}
            </div>
          </>
        )}

        {/* Address */}
        {!isProject && selected.address_full && (
          <>
            <div className="h-px bg-gray-100" />
            <div>
              <p className="text-[11px] font-medium text-gray-400 uppercase mb-1">ที่อยู่</p>
              <p className="text-[13px] text-gray-600">{selected.address_full}</p>
            </div>
          </>
        )}

        {/* Extra */}
        {!isProject && (selected.employee_count || selected.join_date || selected.geo_source) && (
          <>
            <div className="h-px bg-gray-100" />
            <div className="grid grid-cols-2 gap-2 text-[12px]">
              {selected.employee_count && <div><span className="text-gray-400">พนักงาน:</span> <b>{selected.employee_count}</b></div>}
              {selected.join_date && <div><span className="text-gray-400">เข้าร่วม:</span> <b>{selected.join_date}</b></div>}
              {selected.geo_source && <div><span className="text-gray-400">แหล่งพิกัด:</span> <b>{selected.geo_source}</b></div>}
            </div>
          </>
        )}

        {/* Marketing */}
        {!isProject && selected.marketing && Object.values(selected.marketing as Record<string, boolean>).some(Boolean) && (
          <>
            <div className="h-px bg-gray-100" />
            <div>
              <p className="text-[11px] font-medium text-gray-400 uppercase mb-1.5">ช่องทางการตลาด</p>
              <div className="flex flex-wrap gap-1">
                {Object.entries(selected.marketing as Record<string, boolean>).filter(([, v]) => v).map(([k]) => (
                  <span key={k} className="text-[11px] px-2 py-0.5 rounded-full border" style={{ background: "#ebf5ff", color: "#378ADD", borderColor: "#bfdbfe" }}>{k}</span>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Project link */}
        {!isProject && selected.project_name && (
          <>
            <div className="h-px bg-gray-100" />
            <div>
              <p className="text-[11px] font-medium text-gray-400 uppercase mb-1">โครงการที่เกี่ยวข้อง</p>
              <span className="inline-flex items-center gap-1 text-[12px] px-2 py-1 rounded-lg border" style={{ background: "#e8eef5", color: NAVY, borderColor: "#c3d4e8" }}>
                <Building2 className="w-3 h-3" /> {selected.project_name}
              </span>
            </div>
          </>
        )}

        {/* Linked partners */}
        {isProject && (
          <>
            <div className="h-px bg-gray-100" />
            <div>
              <p className="text-[11px] font-medium text-gray-400 uppercase mb-2">พาร์ทเนอร์ของโครงการนี้ ({linkedPartners.length})</p>
              {linkedPartners.length === 0 ? (
                <p className="text-[13px] text-gray-400">ยังไม่มีพาร์ทเนอร์ผูกกับโครงการนี้</p>
              ) : (
                <div className="space-y-1.5">
                  {linkedPartners.map((p, i) => (
                    <div key={i} className="flex items-start gap-2 text-[13px] py-1 px-2 rounded hover:bg-gray-50">
                      <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: TYPE_COLORS[p.entity_type] || "#666" }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-700 truncate">{p.name}</p>
                        <p className="text-[11px] text-gray-400">{TYPE_LABELS[p.entity_type] || p.entity_type}{p.admin_zone && ` · ${p.admin_zone}`}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
