"use client";

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

interface LinkedPartner { name: string; entity_type: string; phone: string; email: string; admin_zone: string; }

export default function DetailPanel({
  selected,
  linkedPartners,
  onClose,
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
      <div className={`px-4 py-3 flex items-center justify-between ${isProject ? "bg-red-50 border-b border-red-100" : "bg-gray-50 border-b border-gray-100"}`}>
        <h3 className="font-semibold text-sm text-gray-800">
          {isProject ? "🏢 รายละเอียดโครงการ" : "📋 รายละเอียดพาร์ทเนอร์"}
        </h3>
        <button onClick={onClose} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded hover:bg-gray-200">✕</button>
      </div>

      <div className="px-4 py-3 space-y-3 text-sm">
        {/* Name + badge */}
        <div>
          <p className="font-semibold text-base text-gray-900">{selected.name as string}</p>
          {!isProject && (
            <span className="inline-flex items-center gap-1.5 mt-1 text-[11px] px-2 py-0.5 rounded-full"
              style={{ background: `${TYPE_COLORS[selected.entity_type as string] || "#666"}20`, color: TYPE_COLORS[selected.entity_type as string] || "#666" }}>
              <span className="w-2 h-2 rounded-full" style={{ background: TYPE_COLORS[selected.entity_type as string] || "#666" }} />
              {TYPE_LABELS[selected.entity_type as string] || selected.entity_type as string}
            </span>
          )}
          {isProject && selected.status && (
            <span className="inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full bg-red-100 text-red-600">{selected.status as string}</span>
          )}
        </div>

        {/* Location info */}
        <div className="space-y-1 text-[13px] text-gray-600">
          {!isProject ? (
            <>
              {selected.admin_zone && <p>📍 เขต/อำเภอ: <b>{selected.admin_zone as string}</b></p>}
              {selected.subzone && <p>🏘️ แขวง/ตำบล: {selected.subzone as string}</p>}
              {selected.province && <p>🗺️ จังหวัด: <b>{selected.province as string}</b></p>}
            </>
          ) : (
            <>
              {selected.zone && <p>📍 โซน: <b>{selected.zone as string}</b></p>}
              {selected.admin_zone && <p>🏘️ เขต: {selected.admin_zone as string}</p>}
              {selected.province && <p>🗺️ จังหวัด: {selected.province as string}</p>}
            </>
          )}
        </div>

        {/* Google Maps link */}
        {selected.lat && selected.lng && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${selected.lat},${selected.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition border border-blue-100"
          >
            🗺️ เปิดใน Google Maps
          </a>
        )}

        {/* Contact (partners only) */}
        {!isProject && (
          <>
            <div className="h-px bg-gray-100" />
            <div className="space-y-1 text-[13px] text-gray-600">
              {selected.phone && <p>📞 {selected.phone as string}</p>}
              {selected.email && <p className="break-all">✉️ {selected.email as string}</p>}
              {selected.contact_name && <p>👤 {selected.contact_name as string}</p>}
            </div>
          </>
        )}

        {/* Address */}
        {!isProject && selected.address_full && (
          <>
            <div className="h-px bg-gray-100" />
            <div>
              <p className="text-[11px] font-medium text-gray-400 uppercase mb-1">ที่อยู่</p>
              <p className="text-[13px] text-gray-600">{selected.address_full as string}</p>
            </div>
          </>
        )}

        {/* Extra info */}
        {!isProject && (
          <>
            {(selected.employee_count || selected.join_date || selected.geo_source) && (
              <>
                <div className="h-px bg-gray-100" />
                <div className="grid grid-cols-2 gap-2 text-[12px]">
                  {selected.employee_count && <div><span className="text-gray-400">พนักงาน:</span> <b>{selected.employee_count as string | number}</b></div>}
                  {selected.join_date && <div><span className="text-gray-400">เข้าร่วม:</span> <b>{selected.join_date as string}</b></div>}
                  {selected.geo_source && <div><span className="text-gray-400">แหล่งพิกัด:</span> <b>{selected.geo_source as string}</b></div>}
                </div>
              </>
            )}
            {/* Marketing tags */}
            {selected.marking && (
              <>
                <div className="h-px bg-gray-100" />
                <div>
                  <p className="text-[11px] font-medium text-gray-400 uppercase mb-1.5">ช่องทางการตลาด</p>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(selected.marketing as Record<string, boolean>).filter(([, v]) => v).map(([k]) => (
                      <span key={k} className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">{k}</span>
                    ))}
                  </div>
                </div>
              </>
            )}
            {/* Project link */}
            {selected.project_name && (
              <>
                <div className="h-px bg-gray-100" />
                <div>
                  <p className="text-[11px] font-medium text-gray-400 uppercase mb-1">โครงการที่เกี่ยวข้อง</p>
                  <span className="inline-flex items-center gap-1 text-[12px] px-2 py-1 rounded-lg bg-red-50 text-red-600 border border-red-100">
                    🏢 {selected.project_name as string}
                  </span>
                </div>
              </>
            )}
          </>
        )}

        {/* Linked partners (project only) */}
        {isProject && (
          <>
            <div className="h-px bg-gray-100" />
            <div>
              <p className="text-[11px] font-medium text-gray-400 uppercase mb-2">
                พาร์ทเนอร์ของโครงการนี้ ({linkedPartners.length})
              </p>
              {linkedPartners.length === 0 ? (
                <p className="text-[13px] text-gray-400">ยังไม่มีพาร์ทเนอร์ผูกกับโครงการนี้</p>
              ) : (
                <div className="space-y-1.5">
                  {linkedPartners.map((p, i) => (
                    <div key={i} className="flex items-start gap-2 text-[13px] py-1 px-2 rounded hover:bg-gray-50">
                      <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: TYPE_COLORS[p.entity_type] || "#666" }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-700 truncate">{p.name}</p>
                        <p className="text-[11px] text-gray-400">
                          {TYPE_LABELS[p.entity_type] || p.entity_type}
                          {p.admin_zone && ` · ${p.admin_zone}`}
                        </p>
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
