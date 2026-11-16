import type { ComponentType } from 'react'
import { useAppState } from '@/app/ServicesContext'
import type { Screen } from '@/app/AppStore'
import { LoginScreen } from '@/screens/LoginScreen'
import { ProfileScreen } from '@/screens/ProfileScreen'
import { DiagnosticScreen, ExitDiagnosticScreen } from '@/screens/DiagnosticScreen'
import { DiagnosticResultScreen } from '@/screens/DiagnosticResultScreen'
import { HomeScreen } from '@/screens/HomeScreen'
import { PlayerScreen } from '@/screens/player/PlayerScreen'
import { TeacherScreen } from '@/screens/teacher/TeacherScreen'
import { CasesScreen } from '@/screens/CasesScreen'
import { TutorScreen } from '@/screens/TutorScreen'
import { AnalysisScreen } from '@/screens/AnalysisScreen'
import { AiCheckScreen } from '@/screens/AiCheckScreen'
import { ProgressScreen } from '@/screens/ProgressScreen'
import { SurveyScreen } from '@/screens/SurveyScreen'

const SCREENS: Record<Screen, ComponentType> = {
  login: LoginScreen,
  profile: ProfileScreen,
  diag: DiagnosticScreen,
  exitdiag: ExitDiagnosticScreen,
  diagres: DiagnosticResultScreen,
  home: HomeScreen,
  cases: CasesScreen,
  tutor: TutorScreen,
  analysis: AnalysisScreen,
  aicheck: AiCheckScreen,
  progress: ProgressScreen,
  survey: SurveyScreen,
  player: PlayerScreen,
  teacher: TeacherScreen,
}

export function App() {
  const { screen } = useAppState()
  const View = SCREENS[screen]
  return <View />
}
