import { ConfigProvider } from 'antd';
import AppRouter from './app/AppRouter';
import { AuthProvider } from './features/auth/AuthContext';
import { ModuleProvider } from './features/modules/ModuleContext';
import antdTheme from './theme/antdTheme';

function App() {
  return (
    <ConfigProvider theme={antdTheme}>
      <AuthProvider>
        <ModuleProvider>
          <AppRouter />
        </ModuleProvider>
      </AuthProvider>
    </ConfigProvider>
  );
}

export default App;
