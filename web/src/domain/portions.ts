// BR-4 / AC-2: a signup is for a whole number of portions, at least one.
export function isValidPortions(portions: number): boolean {
  return Number.isInteger(portions) && portions >= 1
}
