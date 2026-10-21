import React, { useState } from 'react';
import { TitleBar } from './components/layout/TitleBar';
import { HomeView } from './components/home/HomeView';
import { EditorView } from './components/editor/EditorView';
import { NewProjectModal } from './components/modals/NewProjectModal';
import { OpenProjectModal } from './components/modals/OpenProjectModal';
import { SettingsModal } from './components/modals/SettingsModal';
import { UpdateModal } from './components/modals/UpdateModal';
import { JsonCodeModal } from './components/modals/JsonCodeModal';
import { TestModal } from './components/modals/TestModal';
import { RuntimeModal } from './components/modals/RuntimeModal';
import { BuildPackageModal } from './components/modals/BuildPackageModal';
import { ConfirmModal } from './components/modals/ConfirmModal';
import { SaveToast } from './components/common/SaveToast';
import { useProject } from './context/ProjectContext';

export const App: React.FC = () => {
  const {
    screen,
    setScreen,
    currentProject,
    showTestModal,
    setShowTestModal,
    showRuntimeModal,
    setShowRuntimeModal,
    showBuildModal,
    setShowBuildModal,
    showSettingsModal,
    setShowSettingsModal,
    showUpdateModal,
    setShowUpdateModal,
    showJsonModal,
    setShowJsonModal,
    jsonModalMode,
    updateInfo,
    openProjectByPath,
    confirmModalState,
    closeConfirmModal,
  } = useProject();
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isOpenModalOpen, setIsOpenModalOpen] = useState(false);

  const handleOpenProject = async () => {
    if ((window as any).electronAPI?.openFolderDialog) {
      try {
        const selected = await (window as any).electronAPI.openFolderDialog();
        if (selected) {
          openProjectByPath(selected);
        }
      } catch {
        setIsOpenModalOpen(true);
      }
    } else {
      setIsOpenModalOpen(true);
    }
  };

  // Nếu đang ở chế độ Runtime: Hiển thị giao diện Runtime toàn màn hình (Ảnh 2), không hiển thị code
  if (screen === 'runtime') {
    return (
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#f8fafc] dark:bg-[#080d19] select-none text-[#1e293b] dark:text-[#e2e8f0]">
        <RuntimeModal
          isOpen={true}
          fullWindow={true}
          onClose={() => setScreen(currentProject ? 'editor' : 'home')}
        />
        <ConfirmModal
          isOpen={!!confirmModalState}
          onClose={closeConfirmModal}
          options={confirmModalState}
        />
        <SaveToast />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#f8fafc] dark:bg-[#080d19] select-none text-[#1e293b] dark:text-[#e2e8f0] transition-colors">
      {/* App Window TitleBar */}
      <TitleBar projectName={currentProject?.info.name} />

      {/* Main View Router */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {screen === 'home' ? (
          <HomeView
            onNewProject={() => setIsNewModalOpen(true)}
            onOpenProject={handleOpenProject}
            onSettings={() => setShowSettingsModal(true)}
          />
        ) : (
          <EditorView
            onNewProject={() => setIsNewModalOpen(true)}
            onOpenProject={handleOpenProject}
          />
        )}
      </div>

      {/* Global Modals */}
      <NewProjectModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
      />
      <OpenProjectModal
        isOpen={isOpenModalOpen}
        onClose={() => setIsOpenModalOpen(false)}
      />
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
      <UpdateModal
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        updateInfo={updateInfo}
      />
      <JsonCodeModal
        isOpen={showJsonModal}
        onClose={() => setShowJsonModal(false)}
        initialMode={jsonModalMode}
      />
      <TestModal
        isOpen={showTestModal}
        onClose={() => setShowTestModal(false)}
      />
      <RuntimeModal
        isOpen={showRuntimeModal}
        onClose={() => setShowRuntimeModal(false)}
      />
      <BuildPackageModal
        isOpen={showBuildModal}
        onClose={() => setShowBuildModal(false)}
      />
      <ConfirmModal
        isOpen={!!confirmModalState}
        onClose={closeConfirmModal}
        options={confirmModalState}
      />

      {/* Floating Save Toast Notification (Image 1) */}
      <SaveToast />
    </div>
  );
};
