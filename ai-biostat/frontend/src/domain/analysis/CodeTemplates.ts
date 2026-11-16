import type { Dataset } from './Dataset'
import type { Summary } from './Descriptives'

/**
 * Воспроизводимый код к расчёту: студент видит, как получить те же цифры в R и Python.
 * Python: pandas; R: базовые функции. Разделитель и десятичная запятая — как в загруженном файле.
 */
export interface CodePair { python: string; r: string }

const pyStr = (s: string) => JSON.stringify(s)
const rStr = (s: string) => JSON.stringify(s)

function pyRead(ds: Dataset): string {
  if (ds.delimiter === ';') return `d = pd.read_csv(${pyStr(ds.name)}, sep=";", decimal=",")`
  if (ds.delimiter === '\t') return `d = pd.read_csv(${pyStr(ds.name)}, sep="\\t")`
  return `d = pd.read_csv(${pyStr(ds.name)})`
}

function rRead(ds: Dataset): string {
  if (ds.delimiter === ';') return `d <- read.csv2(${rStr(ds.name)})`
  if (ds.delimiter === '\t') return `d <- read.delim(${rStr(ds.name)})`
  return `d <- read.csv(${rStr(ds.name)})`
}

export function codeFor(ds: Dataset, column: string, summary: Summary): CodePair {
  const col = pyStr(column)
  if (summary.kind === 'numeric') {
    return {
      python: [
        'import pandas as pd', '', pyRead(ds), `x = d[${col}]`, '',
        'print(x.describe())            # n, среднее, SD, min, квартили, max',
        'print("Медиана:", x.median())',
        'print("Пропуски:", x.isna().sum())',
      ].join('\n'),
      r: [
        rRead(ds), `x <- d[[${rStr(column)}]]`, '',
        'summary(x)                      # min, квартили, медиана, среднее, max',
        'sd(x, na.rm = TRUE)',
        'length(na.omit(x))              # n',
        'sum(is.na(x))                   # пропуски',
      ].join('\n'),
    }
  }
  return {
    python: [
      'import pandas as pd', '', pyRead(ds), `x = d[${col}]`, '',
      'print(x.value_counts())                          # частоты',
      'print(x.value_counts(normalize=True) * 100)      # доли, %',
      'print("Пропуски:", x.isna().sum())',
    ].join('\n'),
    r: [
      rRead(ds), `x <- d[[${rStr(column)}]]`, '',
      'table(x)                        # частоты',
      'round(prop.table(table(x)) * 100, 1)   # доли, %',
      'sum(is.na(x))                   # пропуски',
    ].join('\n'),
  }
}
