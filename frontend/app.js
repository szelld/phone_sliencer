class SmartHouseApp {
  constructor() {
    this.token = null;
    this.socket = null;
    this.isConnected = false;
    this.state = null;
    
    this.initializeElements();
    this.attachEventListeners();
    this.loadFloorplan();
  }

  initializeElements() {
    // Login elements
    this.loginContainer = document.getElementById('login-container');
    this.loginForm = document.getElementById('login-form');
    this.loginBtn = document.getElementById('login-btn');
    this.loginError = document.getElementById('login-error');
    
    // Dashboard elements
    this.dashboard = document.getElementById('dashboard');
    this.logoutBtn = document.getElementById('logout-btn');
    this.connectionIndicator = document.getElementById('connection-indicator');
    this.connectionText = document.getElementById('connection-text');
    
    // Sensor elements
    this.temperatureValue = document.getElementById('temperature-value');
    this.humidityValue = document.getElementById('humidity-value');
    
    // Fan elements
    this.fanIndicator = document.getElementById('fan-indicator');
    this.fanStatusText = document.getElementById('fan-status-text');
    this.fanMode = document.getElementById('fan-mode');
    this.fanAutoBtn = document.getElementById('fan-auto-btn');
    this.fanOnBtn = document.getElementById('fan-on-btn');
    this.fanOffBtn = document.getElementById('fan-off-btn');
    
    // Lock elements
    this.lockIndicator = document.getElementById('lock-indicator');
    this.lockStatusText = document.getElementById('lock-status-text');
    this.lockBtn = document.getElementById('lock-btn');
    this.unlockBtn = document.getElementById('unlock-btn');
    
    // Climate elements
    this.tempThreshold = document.getElementById('temp-threshold');
    this.humidityThreshold = document.getElementById('humidity-threshold');
    this.updateThresholdsBtn = document.getElementById('update-thresholds-btn');
    
    // Event log
    this.eventLog = document.getElementById('event-log');
  }

  attachEventListeners() {
    // Login
    this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    this.logoutBtn.addEventListener('click', () => this.handleLogout());
    
    // Fan controls
    this.fanAutoBtn.addEventListener('click', () => this.controlFan('auto'));
    this.fanOnBtn.addEventListener('click', () => this.controlFan('manual', 'on'));
    this.fanOffBtn.addEventListener('click', () => this.controlFan('manual', 'off'));
    
    // Lock controls
    this.lockBtn.addEventListener('click', () => this.controlLock('lock'));
    this.unlockBtn.addEventListener('click', () => this.controlLock('unlock'));
    
    // Climate settings
    this.updateThresholdsBtn.addEventListener('click', () => this.updateClimateThresholds());
  }

  async loadFloorplan() {
    try {
      const response = await fetch('floorplan.svg');
      const svgText = await response.text();
      const wrapper = document.getElementById('floorplan-wrapper');
      wrapper.innerHTML = svgText;
      
      // Attach click handlers to rooms
      const rooms = wrapper.querySelectorAll('.room');
      rooms.forEach(room => {
        room.addEventListener('click', (e) => {
          const lightId = e.target.getAttribute('data-light');
          if (lightId) {
            this.toggleLight(lightId);
          }
        });
      });
    } catch (error) {
      console.error('Failed to load floorplan:', error);
    }
  }

  async handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    this.setLoading(true);
    this.hideError();
    
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        this.token = data.token;
        this.showDashboard();
        this.initializeWebSocket();
        await this.loadInitialData();
      } else {
        this.showError(data.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      this.showError('Network error. Please try again.');
    } finally {
      this.setLoading(false);
    }
  }

  handleLogout() {
    this.token = null;
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.showLogin();
  }

  showLogin() {
    this.loginContainer.style.display = 'flex';
    this.dashboard.classList.remove('active');
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    this.hideError();
  }

  showDashboard() {
    this.loginContainer.style.display = 'none';
    this.dashboard.classList.add('active');
  }

  showError(message) {
    this.loginError.textContent = message;
    this.loginError.classList.remove('hidden');
  }

  hideError() {
    this.loginError.classList.add('hidden');
  }

  setLoading(loading) {
    this.loginBtn.disabled = loading;
    this.loginBtn.textContent = loading ? 'Logging in...' : 'Login';
  }

  initializeWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    this.socket = new WebSocket(wsUrl);
    
    this.socket.onopen = () => {
      console.log('WebSocket connected');
      this.setConnectionStatus(true);
    };
    
    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleWebSocketMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };
    
    this.socket.onclose = () => {
      console.log('WebSocket disconnected');
      this.setConnectionStatus(false);
      
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        if (this.token) {
          this.initializeWebSocket();
        }
      }, 5000);
    };
    
    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.setConnectionStatus(false);
    };
  }

  handleWebSocketMessage(message) {
    switch (message.type) {
      case 'snapshot':
        this.state = message.state;
        this.updateUI();
        break;
      case 'update':
        this.handleStateUpdate(message);
        break;
      case 'sensor':
        this.handleSensorUpdate(message);
        break;
      case 'event':
        this.addEventToLog(message);
        break;
    }
  }

  handleStateUpdate(message) {
    if (!this.state) return;
    
    switch (message.entity) {
      case 'light':
        if (this.state.lights[message.id]) {
          this.state.lights[message.id].state = message.state;
          this.updateLightUI(message.id, message.state);
        }
        break;
      case 'fan':
        this.state.fan.state = message.state;
        this.state.fan.mode = message.mode;
        this.updateFanUI();
        break;
      case 'lock':
        this.state.lock.state = message.state;
        this.updateLockUI();
        break;
    }
  }

  handleSensorUpdate(message) {
    if (!this.state) return;
    
    this.state.sensors[message.sensor] = message.value;
    this.updateSensorUI(message.sensor, message.value);
  }

  setConnectionStatus(connected) {
    this.isConnected = connected;
    this.connectionIndicator.classList.toggle('connected', connected);
    this.connectionText.textContent = connected ? 'Connected' : 'Disconnected';
  }

  async loadInitialData() {
    try {
      // Load current state
      const stateResponse = await this.apiCall('/api/state');
      if (stateResponse.ok) {
        this.state = await stateResponse.json();
        this.updateUI();
      }
      
      // Load recent events
      const eventsResponse = await this.apiCall('/api/events?limit=20');
      if (eventsResponse.ok) {
        const events = await eventsResponse.json();
        this.updateEventLog(events);
      }
    } catch (error) {
      console.error('Failed to load initial data:', error);
    }
  }

  updateUI() {
    if (!this.state) return;
    
    // Update sensors
    this.updateSensorUI('temperature', this.state.sensors.temperature);
    this.updateSensorUI('humidity', this.state.sensors.humidity);
    
    // Update lights
    Object.entries(this.state.lights).forEach(([lightId, light]) => {
      this.updateLightUI(lightId, light.state);
    });
    
    // Update fan
    this.updateFanUI();
    
    // Update lock
    this.updateLockUI();
    
    // Update thresholds
    this.tempThreshold.value = this.state.thresholds.temp_high;
    this.humidityThreshold.value = this.state.thresholds.humidity_high;
  }

  updateSensorUI(sensorType, value) {
    const element = sensorType === 'temperature' ? this.temperatureValue : this.humidityValue;
    element.textContent = value !== null ? value.toFixed(1) : '--';
  }

  updateLightUI(lightId, state) {
    // Update room highlighting in SVG
    const room = document.querySelector(`[data-light="${lightId}"]`);
    if (room) {
      room.classList.toggle('on', state === 'on');
    }
    
    // Update light indicators
    const indicator = document.querySelector(`.light-indicator[data-light="${lightId}"]`);
    if (indicator) {
      indicator.classList.toggle('on', state === 'on');
      indicator.classList.toggle('off', state === 'off');
    }
  }

  updateFanUI() {
    if (!this.state) return;
    
    const isOn = this.state.fan.state === 'on';
    this.fanIndicator.classList.toggle('on', isOn);
    this.fanStatusText.textContent = isOn ? 'On' : 'Off';
    this.fanMode.textContent = this.state.fan.mode.charAt(0).toUpperCase() + this.state.fan.mode.slice(1);
    this.fanMode.classList.toggle('auto', this.state.fan.mode === 'auto');
  }

  updateLockUI() {
    if (!this.state) return;
    
    const isLocked = this.state.lock.state === 'locked';
    this.lockIndicator.textContent = isLocked ? '🔒' : '🔓';
    this.lockIndicator.classList.toggle('locked', isLocked);
    this.lockIndicator.classList.toggle('unlocked', !isLocked);
    this.lockStatusText.textContent = isLocked ? 'Locked' : 'Unlocked';
  }

  async toggleLight(lightId) {
    try {
      const response = await this.apiCall(`/api/light/${lightId}/toggle`, { method: 'POST' });
      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to toggle light:', error);
      }
    } catch (error) {
      console.error('Network error toggling light:', error);
    }
  }

  async controlFan(mode, state = null) {
    try {
      const body = { mode };
      if (state) {
        body.state = state;
      }
      
      const response = await this.apiCall('/api/fan', {
        method: 'POST',
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to control fan:', error);
      }
    } catch (error) {
      console.error('Network error controlling fan:', error);
    }
  }

  async controlLock(action) {
    try {
      const response = await this.apiCall('/api/lock', {
        method: 'POST',
        body: JSON.stringify({ action })
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to control lock:', error);
      }
    } catch (error) {
      console.error('Network error controlling lock:', error);
    }
  }

  async updateClimateThresholds() {
    try {
      const tempHigh = parseFloat(this.tempThreshold.value);
      const humidityHigh = parseFloat(this.humidityThreshold.value);
      
      if (isNaN(tempHigh) || isNaN(humidityHigh)) {
        alert('Please enter valid threshold values');
        return;
      }
      
      const response = await this.apiCall('/api/climate', {
        method: 'POST',
        body: JSON.stringify({
          temp_high: tempHigh,
          humidity_high: humidityHigh
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to update thresholds:', error);
      }
    } catch (error) {
      console.error('Network error updating thresholds:', error);
    }
  }

  async apiCall(url, options = {}) {
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      }
    };
    
    return fetch(url, { ...defaultOptions, ...options });
  }

  addEventToLog(event) {
    const eventElement = document.createElement('div');
    eventElement.className = 'event-item';
    
    const timestamp = new Date(event.ts || Date.now()).toLocaleTimeString();
    eventElement.innerHTML = `
      <div class="event-timestamp">${timestamp}</div>
      <div>
        <span class="event-category">${event.category || 'system'}</span>
        ${event.target ? `→ ${event.target}` : ''}
        ${event.action ? `: ${event.action}` : ''}
        ${event.old_state && event.new_state ? ` (${event.old_state} → ${event.new_state})` : ''}
      </div>
    `;
    
    this.eventLog.insertBefore(eventElement, this.eventLog.firstChild);
    
    // Keep only the last 50 events
    while (this.eventLog.children.length > 50) {
      this.eventLog.removeChild(this.eventLog.lastChild);
    }
  }

  updateEventLog(events) {
    this.eventLog.innerHTML = '';
    
    events.reverse().forEach(event => {
      this.addEventToLog(event);
    });
    
    if (events.length === 0) {
      this.eventLog.innerHTML = '<div class="text-center">No events yet</div>';
    }
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new SmartHouseApp();
});