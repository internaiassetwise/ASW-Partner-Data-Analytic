"use client";

import { AlertCircle, Building, Building2, ChevronLeft, FileText, Globe, LoaderCircle, Mail, MapPin, Phone, RefreshCw, User, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { LinkedPartner, MapProperties, NearbyPartner } from "@/lib/types";
import { isProjectProperties } from "@/lib/types";
import { ENTITY_COLORS as TYPE_COLORS, ENTITY_TINTS as TYPE_TINTS } from "@/lib/entityStyles";

const TYPE_LABELS: Record<string, string> = {
  partner: "พาร์ทเนอร์", sponsor: "สปอนเซอร์", bank: "ธนาคาร",
  external_org: "องค์กรภายนอก", partner_2026: "พาร์ทเนอร์ 2026",
  gov_bkk: "โรงเรียน/สถาบัน", gov_district: "สำนักงานเขต กทม.",
};
const NAVY = "#0C2A44";
const PRIMARY_BLUE = "#2F7FBE";
const SOFT_BLUE = "#EAF4FD";
const BORDER = "#DDE4EA";

function Icon({ icon: IconComponent, label, value, bold }: { icon: LucideIcon; label: string; value: string; bold?: boolean }) {
  return (
    <p className="flex items-center gap-2 text-[13px] text-gray-600">
      <IconComponent className="w-3.5 h-3.5 text-gray-400 shrink-0" />
      {label} {bold ? <b>{value}</b> : value}
    </p>
  );
}

export default function DetailPanel({
  selected,
  linkedPartners,
  nearbyPartners = [],
  loading,
  error,
  contextProjectName,
  onBackToProject,
  onRetry,
  onClose,
}: {
  selected: MapProperties | null;
  linkedPartners: LinkedPartner[];
  nearbyPartners: NearbyPartner[];
  loading: boolean;
  error: string;
  contextProjectName?: string;
  onBackToProject?: () => void;
  onRetry?: () => void;
  onClose: () => void;
}) {
  if (!selected) return null;

  const isProject = isProjectProperties(selected);

  return (
    <div className="absolute top-0 right-0 bottom-0 w-80 max-sm:w-full bg-white border-l border-[#DDE4EA] shadow-[0_12px_32px_rgba(12,42,68,0.16)] z-[600] overflow-y-auto">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b" style={{ background: isProject ? SOFT_BLUE : "#F6F8FA", borderColor: BORDER }}>
        <h3 className="font-semibold text-sm flex items-center gap-1.5" style={{ color: isProject ? NAVY : "#1F2937" }}>
          {isProject ? <Building2 className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
          {isProject ? "รายละเอียดโครงการ" : "รายละเอียดพาร์ทเนอร์"}
        </h3>
        <button type="button" onClick={onClose} aria-label="ปิดรายละเอียด" className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded hover:bg-gray-200">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-4 py-3 space-y-3 text-sm">
        {!isProject && contextProjectName && onBackToProject && (
          <button type="button" onClick={onBackToProject} className="inline-flex items-center gap-1 text-xs font-medium text-[#2F7FBE] hover:text-[#0C2A44]">
            <ChevronLeft className="h-3.5 w-3.5" /> กลับไป {contextProjectName}
          </button>
        )}
        {/* Name */}
        <div>
          <p className="font-semibold text-base text-gray-900">{selected.name}</p>
          {!isProject ? (
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full border" style={{ background: TYPE_TINTS[selected.entity_type].background, color: TYPE_TINTS[selected.entity_type].color, borderColor: TYPE_TINTS[selected.entity_type].border }}>
                <span className="w-2 h-2 rounded-full" style={{ background: TYPE_COLORS[selected.entity_type] || "#666" }} />
                {TYPE_LABELS[selected.entity_type] || selected.entity_type}
              </span>
              {selected._distanceKm != null && (
                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border border-[#CFE5F7] bg-[#EAF4FD] text-[#23699F]">
                  <MapPin className="h-3 w-3" /> ห่างจากโครงการ {selected._distanceKm} กม.
                </span>
              )}
            </div>
          ) : (
            selected.status && <span className="inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full border" style={{ background: "#EDF2F5", color: NAVY, borderColor: "#D9E2E8" }}>{selected.status}</span>
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
        {!isProject && (selected.employee_count || selected.join_date) && (
          <>
            <div className="h-px bg-gray-100" />
            <div className="grid grid-cols-2 gap-2 text-[12px]">
              {selected.employee_count && <div><span className="text-gray-400">พนักงาน:</span> <b>{selected.employee_count}</b></div>}
              {selected.join_date && <div><span className="text-gray-400">เข้าร่วม:</span> <b>{selected.join_date}</b></div>}
            </div>
          </>
        )}

        {/* Marketing */}
        {!isProject && Object.values(selected.marketing).some(Boolean) && (
          <>
            <div className="h-px bg-gray-100" />
            <div>
              <p className="text-[11px] font-medium text-gray-400 uppercase mb-1.5">ช่องทางการตลาด</p>
              <div className="flex flex-wrap gap-1">
                {Object.entries(selected.marketing).filter(([, value]) => value).map(([key]) => (
                  <span key={key} className="text-[11px] px-2 py-0.5 rounded-full border" style={{ background: SOFT_BLUE, color: PRIMARY_BLUE, borderColor: "#CFE5F7" }}>{key}</span>
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
              <span className="inline-flex items-center gap-1 text-[12px] px-2 py-1 rounded-lg border" style={{ background: "#EDF2F5", color: NAVY, borderColor: BORDER }}>
                <Building2 className="w-3 h-3" /> {selected.project_name}
              </span>
            </div>
          </>
        )}

        {/* Project partner summary. The searchable lists live in the left
            sidebar so users have one consistent place to browse results. */}
        {isProject && (
          <>
            <div className="h-px bg-gray-100" />
            {loading && (
              <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500" role="status">
                <LoaderCircle className="h-4 w-4 animate-spin" /> กำลังโหลดข้อมูลโครงการ...
              </div>
            )}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">
                <div className="flex items-center gap-2"><AlertCircle className="h-4 w-4" /> {error}</div>
                {onRetry && (
                  <button type="button" onClick={onRetry} className="mt-2 inline-flex items-center gap-1 font-medium underline">
                    <RefreshCw className="h-3 w-3" /> ลองใหม่
                  </button>
                )}
              </div>
            )}
            {!loading && !error && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-[#D9E2E8] bg-[#F6F8FA] px-3 py-2.5">
                    <div className="flex items-center gap-1.5 whitespace-nowrap text-[11px] text-[#6B7280]"><User className="h-3.5 w-3.5" /> พาร์ทเนอร์โครงการ</div>
                    <p className="mt-1 text-xl font-semibold text-[#0C2A44]">{linkedPartners.length}<span className="ml-1 text-[11px] font-normal text-[#6B7280]">ราย</span></p>
                  </div>
                  <div className="rounded-lg border border-[#CFE5F7] bg-[#EAF4FD] px-3 py-2.5">
                    <div className="flex items-center gap-1.5 text-[11px] text-[#23699F]"><MapPin className="h-3.5 w-3.5" /> ใกล้ 10 กม.</div>
                    <p className="mt-1 text-xl font-semibold text-[#23699F]">{nearbyPartners.length}<span className="ml-1 text-[11px] font-normal">ราย</span></p>
                  </div>
                </div>
                <p className="rounded-lg bg-[#F6F8FA] px-3 py-2 text-[10px] leading-relaxed text-[#6B7280]">
                  ดูรายชื่อ ค้นหา และกรองประเภทพาร์ทเนอร์ได้จากแถบด้านซ้าย
                </p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
