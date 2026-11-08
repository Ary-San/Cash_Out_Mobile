export type GoalStatus = "IN_PROGRESS" | "COMPLETED" | "EXPIRED"

/** SavingsGoalResponse */
export interface SavingsGoal {
  id: number
  name: string
  targetAmount: number
  accumulatedAmount: number
  /** 0-100, calculado por el backend. */
  progressPercent: number
  /** yyyy-MM-dd */
  deadline: string
  status: GoalStatus
  completedAt: string | null
  /** LocalDateTime en UTC. */
  createdAt: string
}

/** SavingsGoalRequest */
export interface SavingsGoalInput {
  name: string
  targetAmount: number
  /** yyyy-MM-dd, posterior a hoy. */
  deadline: string
}

export type ContributionSource = "MANUAL" | "INCOME" | "ADJUSTMENT"

/** ContributionResponse */
export interface Contribution {
  id: number
  amount: number
  source: ContributionSource
  /** LocalDateTime en UTC. */
  createdAt: string
}
