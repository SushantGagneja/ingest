// src/components/MockRoleSwitcher.tsx
import { getMockRole, setMockRole } from "@/lib/mock"
import { ROLE_LABEL, type Role } from "@/lib/format"

export function MockRoleSwitcher() {
    return (
        <label className="fixed bottom-3 right-3 z-50 flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-xs shadow-lg">
            Mock role
            <select className="rounded border bg-background px-1 py-0.5" value={getMockRole()} onChange={(e) => setMockRole(e.target.value as Role)}>
                {Object.keys(ROLE_LABEL).map((r) => (
                    <option key={r} value={r}>{ROLE_LABEL[r as Role]}</option>
                ))}
            </select>
        </label>
    )
}
