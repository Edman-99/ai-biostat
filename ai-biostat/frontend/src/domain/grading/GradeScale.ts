export interface Grade {
  min: number
  letter: string
  label: string
}

/** Буквенная шкала, утверждённая для пилота: 100 баллов → буква. */
export class GradeScale {
  private static readonly GRADES: Grade[] = [
    { min: 95, letter: 'A', label: 'отлично' },
    { min: 90, letter: 'A−', label: 'отлично' },
    { min: 85, letter: 'B+', label: 'хорошо' },
    { min: 80, letter: 'B', label: 'хорошо' },
    { min: 75, letter: 'B−', label: 'хорошо' },
    { min: 70, letter: 'C+', label: 'хорошо' },
    { min: 65, letter: 'C', label: 'удовлетворительно' },
    { min: 60, letter: 'C−', label: 'удовлетворительно' },
    { min: 55, letter: 'D+', label: 'удовлетворительно' },
    { min: 50, letter: 'D', label: 'удовлетворительно' },
    { min: 25, letter: 'FX', label: 'неудовлетворительно' },
    { min: 0, letter: 'F', label: 'неудовлетворительно' },
  ]

  gradeOf(score: number): Grade {
    return GradeScale.GRADES.find(g => score >= g.min) ?? GradeScale.GRADES[GradeScale.GRADES.length - 1]
  }
}
