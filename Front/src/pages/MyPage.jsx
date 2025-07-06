// src/pages/MyPage.jsx
import React, { useState } from 'react';
import styled from 'styled-components';
import { User, Music, Heart, History, Settings, LogOut, Plus, X } from 'lucide-react';

// 모달 오버레이
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 2rem;
`;

// 모달 컨테이너 - 카드 크기로 제한
const ModalContainer = styled.div`
  width: 100%;
  max-width: 1100px;
  height: 700px;
  background: white;
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.3);
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
`;

// 모달 헤더
const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 2rem;
  background: linear-gradient(135deg, #6c63ff 0%, #5a54d6 100%);
  color: white;
`;

const ModalTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  transition: background-color 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

// 메인 컨텐츠 영역
const MainContent = styled.div`
  display: flex;
  height: 620px;
  overflow: hidden;
`;

const Sidebar = styled.div`
  width: 280px;
  background: linear-gradient(180deg, #6c63ff 0%, #5a54d6 100%);
  padding: 1.5rem 0;
  overflow-y: auto;
  flex-shrink: 0;
`;

const TabButton = styled.button`
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
  padding: 1rem 2rem;
  background: none;
  border: none;
  color: ${props => props.active ? '#fff' : 'rgba(255,255,255,0.7)'};
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  text-align: left;
  
  &:hover {
    color: white;
    background: rgba(255,255,255,0.1);
  }
  
  ${props => props.active && `
    background: rgba(255,255,255,0.15);
    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 4px;
      background: white;
    }
  `}
`;

const ContentArea = styled.div`
  flex: 1;
  padding: 2.5rem;
  background: #fafafa;
  overflow-y: auto;
  height: 620px;
`;

// 공통 컨텐츠 컨테이너
const ContentWrapper = styled.div`
  height: 530px;
  display: flex;
  flex-direction: column;
`;

const SectionContainer = styled.div`
  background: white;
  border-radius: 16px;
  padding: 2.5rem;
  box-shadow: 0 8px 20px rgba(0,0,0,0.08);
  position: relative;
  height: 530px;
  display: flex;
  flex-direction: column;
  
  &::before {
    content: '';
    position: absolute;
    top: 6px;
    left: 6px;
    right: 6px;
    bottom: 6px;
    background: linear-gradient(135deg, rgba(108,99,255,0.12) 0%, rgba(90,84,214,0.12) 100%);
    border-radius: 16px;
    z-index: -1;
  }
  
  &::after {
    content: '';
    position: absolute;
    top: 12px;
    left: 12px;
    right: 12px;
    bottom: 12px;
    background: linear-gradient(135deg, rgba(108,99,255,0.06) 0%, rgba(90,84,214,0.06) 100%);
    border-radius: 16px;
    z-index: -2;
  }
`;

const ProfileHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 2rem;
  margin-bottom: 2rem;
  padding: 2.5rem;
  background: white;
  border-radius: 16px;
  box-shadow: 0 8px 20px rgba(0,0,0,0.08);
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 6px;
    left: 6px;
    right: 6px;
    bottom: 6px;
    background: linear-gradient(135deg, rgba(108,99,255,0.12) 0%, rgba(90,84,214,0.12) 100%);
    border-radius: 16px;
    z-index: -1;
  }
  
  &::after {
    content: '';
    position: absolute;
    top: 12px;
    left: 12px;
    right: 12px;
    bottom: 12px;
    background: linear-gradient(135deg, rgba(108,99,255,0.06) 0%, rgba(90,84,214,0.06) 100%);
    border-radius: 16px;
    z-index: -2;
  }
`;

const ProfileAvatar = styled.div`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6c63ff 0%, #5a54d6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 2.2rem;
  font-weight: 700;
  box-shadow: 0 8px 20px rgba(108,99,255,0.3);
  border: 3px solid white;
`;

const ProfileDetails = styled.div`
  flex: 1;
`;

const ProfileName = styled.h3`
  font-size: 2rem;
  font-weight: 700;
  color: #333;
  margin-bottom: 0.5rem;
`;

const ProfileEmail = styled.p`
  font-size: 1.1rem;
  color: #666;
  margin-bottom: 0.5rem;
`;

const ProfileJoinDate = styled.p`
  font-size: 1rem;
  color: #999;
`;

const StatsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const StatCard = styled.div`
  background: white;
  padding: 2rem 1.5rem;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0,0,0,0.06);
  transition: transform 0.3s ease;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 3px;
    left: 3px;
    right: 3px;
    bottom: 3px;
    background: linear-gradient(135deg, rgba(108,99,255,0.06) 0%, rgba(90,84,214,0.06) 100%);
    border-radius: 12px;
    z-index: -1;
  }
  
  &:hover {
    transform: translateY(-2px);
  }
`;

const StatValue = styled.h4`
  font-size: 2rem;
  font-weight: 700;
  color: #6c63ff;
  margin-bottom: 0.5rem;
`;

const StatLabel = styled.p`
  font-size: 0.9rem;
  color: #666;
  font-weight: 500;
`;

const LogoutButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 1rem;
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: auto;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(255,107,107,0.3);
  }
`;

const CreatePlaylistButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 1.2rem;
  background: linear-gradient(135deg, #6c63ff 0%, #5a54d6 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 2rem;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(108,99,255,0.3);
  }
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.2rem;
  flex: 1;
  overflow-y: auto;
  padding-right: 0.5rem;
`;

const ItemCard = styled.div`
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 1rem;
  background: #f8f9ff;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid rgba(108,99,255,0.1);
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    background: white;
  }
`;

const ItemThumbnail = styled.div`
  width: 45px;
  height: 45px;
  background: linear-gradient(135deg, #6c63ff 0%, #5a54d6 100%);
  border-radius: 8px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
`;

const ItemDetails = styled.div`
  flex: 1;
  min-width: 0;
`;

const ItemTitle = styled.h5`
  font-size: 0.95rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ItemSubtitle = styled.p`
  font-size: 0.8rem;
  color: #666;
`;

const SectionTitle = styled.h4`
  font-size: 1.4rem;
  font-weight: 700;
  color: #333;
  margin-bottom: 1.5rem;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem;
  color: #666;
  font-size: 1rem;
`;

const SettingsGroup = styled.div`
  background: #f8f9ff;
  padding: 1.5rem;
  border-radius: 12px;
  margin-bottom: 1rem;
  border: 1px solid rgba(108,99,255,0.1);
`;

const SettingsGroupTitle = styled.h5`
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 1rem;
`;

const SettingsItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const SettingsLabel = styled.label`
  font-size: 0.95rem;
  font-weight: 500;
  color: #333;
`;

const SettingsInput = styled.input`
  width: 60%;
  padding: 0.6rem;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  font-size: 0.9rem;
  transition: border-color 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: #6c63ff;
  }
`;

const SaveButton = styled.button`
  padding: 0.6rem 1rem;
  background: linear-gradient(135deg, #6c63ff 0%, #5a54d6 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(108,99,255,0.3);
  }
`;

const ToggleSwitch = styled.label`
  position: relative;
  display: inline-block;
  width: 48px;
  height: 24px;
`;

const ToggleInput = styled.input`
  opacity: 0;
  width: 0;
  height: 0;
`;

const ToggleSlider = styled.span`
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  border-radius: 24px;
  transition: 0.4s;
  
  &:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    border-radius: 50%;
    transition: 0.4s;
  }
  
  ${ToggleInput}:checked + & {
    background-color: #6c63ff;
  }
  
  ${ToggleInput}:checked + &:before {
    transform: translateX(24px);
  }
`;

const MyPage = ({ setActiveModal }) => {
  const [activeTab, setActiveTab] = useState('profile');
  
  const userInfo = {
    username: '음악사랑',
    email: 'music_lover@example.com',
    joinDate: '2023년 5월',
    profileImage: null
  };
  
  const myPlaylists = [
    { id: 1, title: '내가 만든 플레이리스트 #1', tracks: 12 },
    { id: 2, title: '출근길 음악', tracks: 8 },
    { id: 3, title: '운동할 때 듣는 음악', tracks: 15 },
    { id: 4, title: '감성 발라드 모음', tracks: 20 },
    { id: 5, title: '신나는 댄스 음악', tracks: 18 }
  ];
  
  const likedSongs = [
    { id: 1, title: '눈이 오는 날엔', artist: '이무진' },
    { id: 2, title: '밤편지', artist: '아이유' },
    { id: 3, title: 'Dynamite', artist: '방탄소년단' },
    { id: 4, title: 'Celebrity', artist: '아이유' },
    { id: 5, title: '라일락', artist: '아이유' },
    { id: 6, title: 'Permission to Dance', artist: '방탄소년단' }
  ];
  
  const tabs = [
    { id: 'profile', name: '프로필', icon: <User size={20} /> },
    { id: 'playlists', name: '내 플레이리스트', icon: <Music size={20} /> },
    { id: 'liked', name: '좋아요한 음악', icon: <Heart size={20} /> },
    { id: 'history', name: '최근 들은 음악', icon: <History size={20} /> },
    { id: 'settings', name: '설정', icon: <Settings size={20} /> }
  ];
  
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
  };

  const handleLogout = () => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userInfo');
    window.dispatchEvent(new Event('login-status-change'));
    setActiveModal(null);
  };

  const handleClose = () => {
    setActiveModal(null);
  };
  
  const renderTabContent = () => {
    switch(activeTab) {
      case 'profile':
        return (
          <ContentWrapper>
            <ProfileHeader>
              <ProfileAvatar>
                {userInfo.profileImage ? (
                  <img src={userInfo.profileImage} alt="프로필" />
                ) : (
                  <User size={48} />
                )}
              </ProfileAvatar>
              <ProfileDetails>
                <ProfileName>{userInfo.username}</ProfileName>
                <ProfileEmail>{userInfo.email}</ProfileEmail>
                <ProfileJoinDate>가입일: {userInfo.joinDate}</ProfileJoinDate>
              </ProfileDetails>
            </ProfileHeader>
            
            <StatsContainer>
              <StatCard>
                <StatValue>{myPlaylists.length}</StatValue>
                <StatLabel>내 플레이리스트</StatLabel>
              </StatCard>
              <StatCard>
                <StatValue>{likedSongs.length}</StatValue>
                <StatLabel>좋아요한 음악</StatLabel>
              </StatCard>
              <StatCard>
                <StatValue>42</StatValue>
                <StatLabel>최근 들은 음악</StatLabel>
              </StatCard>
            </StatsContainer>
            
            <LogoutButton onClick={handleLogout}>
              <LogOut size={16} />
              로그아웃
            </LogoutButton>
          </ContentWrapper>
        );
      
      case 'playlists':
        return (
          <SectionContainer>
            <CreatePlaylistButton>
              <Plus size={18} />
              새 플레이리스트 만들기
            </CreatePlaylistButton>
            <SectionTitle>내 플레이리스트 ({myPlaylists.length})</SectionTitle>
            <ContentGrid>
              {myPlaylists.map(playlist => (
                <ItemCard key={playlist.id}>
                  <ItemThumbnail>
                    <Music size={20} />
                  </ItemThumbnail>
                  <ItemDetails>
                    <ItemTitle>{playlist.title}</ItemTitle>
                    <ItemSubtitle>{playlist.tracks}곡</ItemSubtitle>
                  </ItemDetails>
                </ItemCard>
              ))}
            </ContentGrid>
          </SectionContainer>
        );
      
      case 'liked':
        return (
          <SectionContainer>
            <SectionTitle>좋아요한 음악 ({likedSongs.length})</SectionTitle>
            <ContentGrid>
              {likedSongs.map(song => (
                <ItemCard key={song.id}>
                  <ItemThumbnail>
                    <Heart size={20} />
                  </ItemThumbnail>
                  <ItemDetails>
                    <ItemTitle>{song.title}</ItemTitle>
                    <ItemSubtitle>{song.artist}</ItemSubtitle>
                  </ItemDetails>
                </ItemCard>
              ))}
            </ContentGrid>
          </SectionContainer>
        );
      
      case 'history':
        return (
          <SectionContainer>
            <SectionTitle>최근 들은 음악</SectionTitle>
            <EmptyState>아직 음악을 들은 기록이 없습니다.</EmptyState>
          </SectionContainer>
        );
      
      case 'settings':
        return (
          <SectionContainer>
            <SectionTitle>설정</SectionTitle>
            <SettingsGroup>
              <SettingsGroupTitle>계정 설정</SettingsGroupTitle>
              <SettingsItem>
                <SettingsLabel>사용자 이름</SettingsLabel>
                <SettingsInput type="text" defaultValue={userInfo.username} />
              </SettingsItem>
              <SettingsItem>
                <SettingsLabel>이메일</SettingsLabel>
                <SettingsInput type="email" defaultValue={userInfo.email} />
              </SettingsItem>
              <SettingsItem>
                <SaveButton>변경사항 저장</SaveButton>
              </SettingsItem>
            </SettingsGroup>
            
            <SettingsGroup>
              <SettingsGroupTitle>앱 설정</SettingsGroupTitle>
              <SettingsItem>
                <SettingsLabel>다크 모드</SettingsLabel>
                <ToggleSwitch>
                  <ToggleInput type="checkbox" />
                  <ToggleSlider />
                </ToggleSwitch>
              </SettingsItem>
              <SettingsItem>
                <SettingsLabel>자동 재생</SettingsLabel>
                <ToggleSwitch>
                  <ToggleInput type="checkbox" defaultChecked />
                  <ToggleSlider />
                </ToggleSwitch>
              </SettingsItem>
            </SettingsGroup>
          </SectionContainer>
        );
      
      default:
        return <EmptyState>콘텐츠를 찾을 수 없습니다.</EmptyState>;
    }
  };

  return (
    <ModalOverlay onClick={handleClose}>
      <ModalContainer onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>마이페이지</ModalTitle>
          <CloseButton onClick={handleClose}>
            <X size={20} />
          </CloseButton>
        </ModalHeader>
        
        <MainContent>
          <Sidebar>
            {tabs.map(tab => (
              <TabButton
                key={tab.id}
                active={activeTab === tab.id}
                onClick={() => handleTabChange(tab.id)}
              >
                {tab.icon}
                {tab.name}
              </TabButton>
            ))}
          </Sidebar>
          
          <ContentArea>
            {renderTabContent()}
          </ContentArea>
        </MainContent>
      </ModalContainer>
    </ModalOverlay>
  );
};

export default MyPage;