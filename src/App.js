import React, { useState } from 'react';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import './App.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function App() {
    const [image, setImage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState({
        season: '',
        characteristics: [],
        skin_tone: { brightness: 0, warmth: 0, contrast: 0 },
        best_colors: [],
        worst_colors: [],
        lab_values: { L: 0, a: 0, b: 0 },
        tone_analysis: {
            brightness_level: '',
            warmth_level: '',
            contrast_level: ''
        }
    });
    const [debugLogs, setDebugLogs] = useState([]);

    const addDebugLog = (type, message, details = null) => {
        const timestamp = new Date().toLocaleTimeString();
        setDebugLogs(prev => [...prev, {
            timestamp,
            type,
            message,
            details
        }]);
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        try {
            if (file && file.type.startsWith('image/')) {
                addDebugLog('info', '이미지 선택됨', {
                    fileName: file.name,
                    fileSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
                    fileType: file.type
                });
                setImage(file);
            } else {
                addDebugLog('error', '잘못된 파일 형식', {
                    fileName: file?.name,
                    fileType: file?.type
                });
                alert('이미지 파일만 업로드 가능합니다.');
            }
        } catch (error) {
            addDebugLog('error', '파일 처리 중 오류 발생', {
                error: error.message
            });
        }
    };

    const handleUpload = async () => {
        if (!image || loading) return;
        
        setLoading(true);
        addDebugLog('info', '분석 시작', {
            fileName: image.name,
            fileSize: `${(image.size / 1024 / 1024).toFixed(2)}MB`
        });

        const formData = new FormData();
        formData.append("image", image);

        try {
            const API_URL = process.env.REACT_APP_API_URL;  //  || "http://127.0.0.1:5000";
            addDebugLog('info', 'API 요청 시작', { 
                url: `${API_URL}/analyze`,
                imageSize: `${(image.size / 1024 / 1024).toFixed(2)}MB`
            });

            const response = await axios.post(
                `${API_URL}/analyze`,
                formData,
                { 
                    headers: { 
                        "Content-Type": "multipart/form-data",
                        "Accept": "application/json"
                    },
                    timeout: 60000, // 타임아웃 60초로 증가
                    maxContentLength: Infinity, // 컨텐츠 길이 제한 해제
                    maxBodyLength: Infinity, // 요청 본문 길이 제한 해제
                    onUploadProgress: (progressEvent) => {
                        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        addDebugLog('info', '업로드 진행률', { 
                            progress: `${percentCompleted}%`,
                            loaded: `${(progressEvent.loaded / 1024 / 1024).toFixed(2)}MB`,
                            total: `${(progressEvent.total / 1024 / 1024).toFixed(2)}MB`
                        });
                    }
                }
            );
            
            addDebugLog('success', '분석 완료', {
                season: response.data.season,
                skinTone: response.data.skin_tone
            });
            setResult(response.data);
        } catch (error) {
            console.error("Upload error details:", error);
            
            // 더 자세한 에러 정보 로깅
            addDebugLog('error', '분석 중 오류 발생', {
                errorMessage: error.message,
                errorType: error.name,
                errorResponse: error.response?.data,
                errorStatus: error.response?.status,
                errorStatusText: error.response?.statusText,
                errorConfig: {
                    url: error.config?.url,
                    method: error.config?.method,
                    headers: error.config?.headers
                }
            });

            if (error.code === 'ECONNABORTED') {
                alert("네트워크 상태가 불안정합니다. 다시 시도해주세요.");
            } else if (error.response?.data?.errorType === "NO_FACE_DETECTED") {
                alert("얼굴을 찾을 수 없습니다. 정면을 바라보는 다른 사진으로 시도해주세요.");
            } else if (error.message === "Network Error") {
                alert("네트워크 연결을 확인해주세요. 와이파이나 모바일 데이터가 활성화되어 있는지 확인해주세요.");
            } else {
                alert("이미지 분석 중 오류가 발생했습니다. 다시 시도해주세요.");
            }
        } finally {
            setLoading(false);
        }
    };

    const calculateRelativeValue = (value, threshold) => {
        // 임계값과의 차이를 -30 ~ +30 범위로 제한
        const difference = value - threshold;
        return Math.max(-10, Math.min(10, difference)); // 차이를 그대로 사용
    };

    const chartData = {
        labels: ['밝기', '웜톤/쿨톤', '선명도'],
        datasets: [
            {
                label: '분석 결과',
                data: [
                    calculateRelativeValue(result.lab_values.L, 160),  // 밝기 임계값: 140
                    calculateRelativeValue((result.lab_values.a * 0.5 + result.lab_values.b * 0.5), 140),  // 웜톤/쿨톤 임계값: 135
                    calculateRelativeValue(Math.sqrt((result.lab_values.a**2 + result.lab_values.b**2)/2), 140)  // 선명도 임계값: 130
                ],
                backgroundColor: [
                    'rgba(255, 223, 61, 0.7)',
                    'rgba(255, 87, 51, 0.7)',
                    'rgba(147, 112, 219, 0.7)'
                ],
                borderColor: [
                    'rgba(255, 223, 61, 1)',
                    'rgba(255, 87, 51, 1)',
                    'rgba(147, 112, 219, 1)'
                ],
                borderWidth: 2
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'bottom'
            },
            title: {
                display: true,
                text: '피부톤 분석 결과',
                font: {
                    size: 14
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                suggestedMin: -10,
                suggestedMax: 10,
                ticks: {
                    stepSize: 0.5,
                    callback: function(value) {
                        if (value === 0) return '기준값';
                        return value;
                    }
                },
                grid: {
                    color: context => context.tick.value === 0 ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.1)'
                }
            }
        },
        animation: {
            duration: 2000
        }
    };

    const ColorBox = ({ color }) => (
        <div className="color-box">
            <div
                style={{
                    backgroundColor: color.value,
                    border: '1px solid rgba(0,0,0,0.1)'
                }}
            />
            <span className="color-name">{color.name}</span>
        </div>
    );

    const DebugLogs = () => (
        <div className="debug-logs" style={{
            backgroundColor: '#1e1e1e',
            color: '#fff',
            padding: '15px',
            borderRadius: '8px',
            marginTop: '20px',
            fontFamily: 'monospace',
            fontSize: '14px',
            maxHeight: '300px',
            overflowY: 'auto'
        }}>
            <h3 style={{ color: '#fff', marginBottom: '10px' }}>디버그 로그</h3>
            {debugLogs.map((log, index) => (
                <div key={index} style={{
                    marginBottom: '8px',
                    padding: '8px',
                    backgroundColor: log.type === 'error' ? '#ff000022' : 
                                   log.type === 'success' ? '#00ff0022' : 
                                   '#ffffff22',
                    borderRadius: '4px'
                }}>
                    <span style={{ color: '#888' }}>[{log.timestamp}] </span>
                    <span style={{ 
                        color: log.type === 'error' ? '#ff6b6b' : 
                               log.type === 'success' ? '#69db7c' : 
                               '#4dabf7'
                    }}>
                        {log.type.toUpperCase()}:
                    </span>
                    <span> {log.message}</span>
                    {log.details && (
                        <pre style={{ 
                            marginTop: '5px', 
                            fontSize: '12px',
                            color: '#888' 
                        }}>
                            {JSON.stringify(log.details, null, 2)}
                        </pre>
                    )}
                </div>
            ))}
        </div>
    );

    return (
        <div className="App">
            <div className="container">
                <h1>퍼스널 컬러 분석</h1>
                
                <div className="upload-section">
                    <div className={`upload-box ${image ? 'has-image' : ''}`}>
                        <input
                            type="file"
                            onChange={handleFileChange}
                            accept="image/*"
                        />
                        {image && (
                            <img src={URL.createObjectURL(image)} alt="Preview" />
                        )}
                    </div>
                    <button 
                        className={`upload-button ${loading ? 'loading' : ''}`}
                        onClick={handleUpload} 
                        disabled={!image || loading}
                    >
                        {loading ? (
                            <span>분석 중...</span>
                        ) : (
                            <span>분석하기</span>
                        )}
                    </button>
                </div>

                {result.season && (
                    <div className="result-section">
                        <div className="result-title">
                            당신은 <span style={{color: '#FF6B6B'}}>{result.season}</span> 입니다!
                        </div>
                        
                        <div className="chart-section">
                            <Bar data={chartData} options={chartOptions} />
                        </div>

                        <div className="debug-section" style={{
                            backgroundColor: '#f5f5f5',
                            padding: '20px',
                            margin: '20px 0',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontFamily: 'monospace'
                        }}>
                            <h3>디버그 정보</h3>
                            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
                                <div>
                                    <h4>원본 Lab 값:</h4>
                                    <pre>
                                        L: {result.debug_info.raw_values.L}
                                        a: {result.debug_info.raw_values.a}
                                        b: {result.debug_info.raw_values.b}
                                    </pre>
                                </div>
                                <div>
                                    <h4>계산 결과:</h4>
                                    <pre>
                                        밝기: {result.debug_info.calculations.brightness_calc}
                                        웜톤: {result.debug_info.calculations.warmth_calc}
                                        대비: {result.debug_info.calculations.contrast_calc}
                                    </pre>
                                </div>
                                <div>
                                    <h4>피부톤 특성:</h4>
                                    <pre>
                                        밝기: {result.tone_analysis.brightness_level}
                                        톤: {result.tone_analysis.warmth_level}
                                        선명도: {result.tone_analysis.contrast_level}
                                    </pre>
                                </div>
                                <div>
                                    <h4>임계값:</h4>
                                    <pre>
                                        밝기: {JSON.stringify(result.debug_info.thresholds.brightness, null, 2)}
                                        웜톤: {JSON.stringify(result.debug_info.thresholds.warmth, null, 2)}
                                        대비: {JSON.stringify(result.debug_info.thresholds.contrast, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        </div>

                        <div className="color-section">
                            <div className={`best-colors ${result.season.split(' ')[0].toLowerCase()}`}>
                                <h3>추천 컬러</h3>
                                <div className="color-boxes">
                                    {result.best_colors.map((color, index) => (
                                        <ColorBox key={index} color={color} />
                                    ))}
                                </div>
                            </div>
                            <div className={`worst-colors ${result.season.split(' ')[0].toLowerCase()}`}>
                                <h3>피해야 할 컬러</h3>
                                <div className="color-boxes">
                                    {result.worst_colors.map((color, index) => (
                                        <ColorBox key={index} color={color} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <DebugLogs />
        </div>
    );
}

export default App;