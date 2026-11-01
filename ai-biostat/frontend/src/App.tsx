import type { ComponentType } from 'react'
import { useAppState } from '@/app/ServicesContext'
import type { Screen } from '@/app/AppStore'
import { LoginScreen } from '@/screens/LoginScreen'
import { ProfileScreen } from '@/screens/ProfileScreen'
import { DiagnosticScreen } from '@/screens/DiagnosticScreen'
import { DiagnosticResultScreen } from '@/screens/DiagnosticResultScreen'
import { HomeScreen } from '@/screens/HomeScreen'
import { PlayerScreen } from '@/screens/player/PlayerScreen'
import { TeacherScreen } from '@/screens/teacher/TeacherScreen'

const SCREENS: Record<Screen, ComponentType> = {
  login: LoginScreen,
  profile: ProfileScreen,
  diag: DiagnosticScreen,
  diagres: DiagnosticResultScreen,
  home: HomeScreen,
  player: PlayerScreen,
  teacher: TeacherScreen,
}

export function App() {
  const { screen } = useAppState()
  const View = SCREENS[screen]
  return <View />
}
