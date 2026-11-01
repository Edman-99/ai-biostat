export interface Grade {
  min: number
  letter: string
  /** ключ перевода: grade.<labelKey> */
  labelKey: 'excellent' | 'good' | 'satisfactory' | 'fail'
}

/** Буквенная шкала, утверждённая для пилота: 100 баллов → буква. */
export class GradeScale {
  private static readonly GRADES: Grade[] = [
    { min: 95, letter: 'A', labelKey: 'excellent' },
    { min: 90, letter: 'A−', labelKey: 'excellent' },
    { min: 85, letter: 'B+', labelKey: 'good' },
    { min: 80, letter: 'B', labelKey: 'good' },
    { min: 75, letter: 'B−', labelKey: 'good' },
    { min: 70, letter: 'C+', labelKey: 'good' },
    { min: 65, letter: 'C', labelKey: 'satisfactory' },
    { min: 60, letter: 'C−', labelKey: 'satisfactory' },
    { min: 55, letter: 'D+', labelKey: 'satisfactory' },
    { min: 50, letter: 'D', labelKey: 'satisfactory' },
    { min: 25, letter: 'FX', labelKey: 'fail' },
    { min: 0, letter: 'F', labelKey: 'fail' },
  ]

  gradeOf(score: number): Grade {
    return GradeScale.GRADES.find(g => score >= g.min) ?? GradeScale.GRADES[GradeScale.GRADES.length - 1]
  }
}
