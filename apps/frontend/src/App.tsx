import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from './store/useStore'
import { api } from './hooks/useApi'
import { useWebSocket } from './hooks/useWebSocket'
import { OfficeSidebar } from './components/Sidebar/OfficeSidebar'
import { OfficeView } from './components/Office/OfficeView'
import { ConversationPanel } from './components/Conversation/ConversationPanel'

function AppInner() {
  const { t } = useTranslation()
  const { offices, activeOfficeId, setOffices, setActiveOffice, setMessages } = useStore()

  // Tema — uygulama genelinde, localStorage'da saklanır
  const [appTheme, setAppTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('theme') as 'light' | 'dark') || 'light')
  const isNight = appTheme === 'dark'
  const handleThemeChange = useCallback((theme: 'light' | 'dark') => {
    setAppTheme(theme)
    localStorage.setItem('theme', theme)
  }, [])

  // activeOffice doğrudan hesaplanıyor — reaktif, her render'da güncellenir
  const currentOffice = offices.find(o => o.id === activeOfficeId) ?? null

  // İlk otomatik seçimi tek seferlik yapmak için ref
  const autoSelected = useRef(false)

  // WebSocket — aktif ofis değişince yeniden bağlan
  useWebSocket(activeOfficeId)

  useEffect(() => {
    api.getOffices().then(data => {
      setOffices(data)
      if (!autoSelected.current && data.length > 0) {
        autoSelected.current = true
        setActiveOffice(data[0].id)
      }
    })
  }, [])

  useEffect(() => {
    if (!activeOfficeId) return
    api.getMessages(activeOfficeId, 100).then(setMessages)
  }, [activeOfficeId])

  const handleOfficeUpdate = () => {
    api.getOffices().then(setOffices)
  }

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Sol sidebar — ofis listesi */}
      <OfficeSidebar
        onSelectOffice={setActiveOffice}
        onOfficesChange={handleOfficeUpdate}
        isNight={isNight}
        appTheme={appTheme}
        onThemeChange={handleThemeChange}
      />

      {/* Ana alan — ofis canvas */}
      <div className="flex-1 relative overflow-hidden">
        {currentOffice ? (
          <OfficeView
            office={currentOffice}
            onOfficeUpdate={handleOfficeUpdate}
          />
        ) : (
          <div className="h-full office-floor flex items-center justify-center">
            <div className="text-center">
              <div className="text-7xl mb-4">🥯</div>
              <h2 className="text-2xl font-black text-[#7a5c3f] mb-2">{t('app.title')}</h2>
              <p className="text-[#a08060]">{t('app.emptyState')}</p>
            </div>
          </div>
        )}
      </div>

      {/* Sağ panel — konuşmalar */}
      {currentOffice && (
        <ConversationPanel office={currentOffice} isNight={isNight} />
      )}
    </div>
  )
}

export default function App() {
  return <AppInner />
}
