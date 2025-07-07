// src/services/apiService.js
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'http://54.180.116.4:8000'  // AWS EC2 퍼블릭 IP
  : 'http://localhost:8000';     // 로컬 개발 환경

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // 기본 fetch 메서드
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const token = localStorage.getItem('userToken');
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
    };

    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      headers: defaultHeaders,
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // 회원가입
  async register(userData) {
    return this.request('/users/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  // 로그인
  async login(credentials) {
    // OAuth2PasswordRequestForm 형식으로 데이터 전송
    const formData = new FormData();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);

    const response = await fetch(`${this.baseURL}/users/login`, {
      method: 'POST',
      headers: {
        // FormData 사용시 Content-Type 헤더를 설정하지 않음 (브라우저가 자동 설정)
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // 구체적인 에러 메시지 처리
      if (response.status === 401) {
        throw new Error('Incorrect username or password');
      } else if (response.status === 422) {
        throw new Error('입력 데이터가 올바르지 않습니다.');
      } else if (response.status >= 500) {
        throw new Error('서버 오류가 발생했습니다.');
      }
      
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // 응답 데이터 검증
    if (!data.access_token) {
      throw new Error('토큰을 받지 못했습니다.');
    }
    
    return data;
  }

  // 현재 사용자 정보 조회
  async getCurrentUser() {
    return this.request('/users/me');
  }

  // 사용자 정보 업데이트
  async updateUser(userData) {
    return this.request('/users/me', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  // 비밀번호 변경
  async changePassword(passwordData) {
    return this.request('/users/me/password', {
      method: 'PUT',
      body: JSON.stringify(passwordData),
    });
  }

  // 관심 아티스트 목록 조회
  async getFavoriteArtists() {
    return this.request('/users/me/favorite-artists');
  }

  // 관심 아티스트 추가
  async addFavoriteArtist(artistId) {
    return this.request('/users/me/favorite-artists', {
      method: 'POST',
      body: JSON.stringify({ artist_id: artistId }),
    });
  }

  // 관심 아티스트 삭제
  async removeFavoriteArtist(artistId) {
    return this.request(`/users/me/favorite-artists/${artistId}`, {
      method: 'DELETE',
    });
  }
}

export default new ApiService();