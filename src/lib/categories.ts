import {
  Bus,
  GraduationCap,
  HeartPulse,
  Lightbulb,
  PartyPopper,
  Shapes,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react-native"
import { EXPENSE_CATEGORIES, type ExpenseCategory } from "@/types/movements"

// Los mismos nombres e iconos que en la web, para que un gasto se reconozca en las dos.
export const CATEGORY_META: Record<ExpenseCategory, { label: string; icon: LucideIcon }> = {
  FOOD: { label: "Comida", icon: UtensilsCrossed },
  TRANSPORT: { label: "Transporte", icon: Bus },
  SERVICES: { label: "Servicios", icon: Lightbulb },
  EDUCATION: { label: "Educación", icon: GraduationCap },
  LEISURE: { label: "Ocio", icon: PartyPopper },
  HEALTH: { label: "Salud", icon: HeartPulse },
  OTHER: { label: "Otros", icon: Shapes },
}

export function isExpenseCategory(value: unknown): value is ExpenseCategory {
  return typeof value === "string" && (EXPENSE_CATEGORIES as readonly string[]).includes(value)
}
