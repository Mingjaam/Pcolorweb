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
  Legend,
  ArcElement,
  DoughnutController
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import './App.css';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  DoughnutController
);

function UploadPage() {
    const [image, setImage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState(null);
    const navigate = useNavigate();

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            setImage(file);
        } else {
            alert('이미지 파일만 업로드 가능합니다.');
        }
    };

    const handleUpload = async () => {
        if (!image || loading) return;
        
        setLoading(true);
        const formData = new FormData();
        
        try {
            formData.append("image", image);
            const API_URL = "https://pcolorweb.onrender.com";

            const response = await axios.post(
                `${API_URL}/analyze`,
                formData,
                { 
                    headers: { "Content-Type": "multipart/form-data" }
                }
            );
            setAnalysisResult(response.data);
        } catch (error) {
            console.error("Upload error:", error);
            if (error.response?.data?.errorType === "NO_FACE_DETECTED") {
                alert("얼굴을 찾을 수 없습니다. 정면을 바라보는 다른 사진으로 시도해주세요.");
            } else {
                alert("이미지 분석 중 오류가 발생했습니다. 다시 시도해주세요.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container">
            <h1>AI 퍼스널 컬러 분석</h1>
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
                {!analysisResult ? (
                    <button 
                        className={`upload-button ${loading ? 'loading' : ''}`}
                        onClick={handleUpload} 
                        disabled={!image || loading}
                    >
                        {loading ? (
                            <>
                                <span>분석 중</span>
                                <div className="loading-spinner"></div>
                            </>
                        ) : (
                            <span>분석하기</span>
                        )}
                    </button>
                ) : (
                    <button 
                        className="upload-button result"
                        onClick={() => navigate('/result', { state: { result: analysisResult } })}
                    >
                        결과 보기
                    </button>
                )}
            </div>
            <div className="info-section">
                <p className="info-text">
                    이 검사는 AI 이미지 분석 모델을 통해 얼굴의 색상값을 분석하는 방식으로 진행됩니다.<br/>
                    조명, 그림자, 화장, 카메라 설정에 따라 결과가 다르게 나올 수 있습니다.
                </p>
                <p className="info-text important">
                    실제 퍼스널 컬러 검사 결과와 다를 수 있습니다.
                </p>
                <p className="info-text">
                    정확한 결과를 위해 아래 사항을 지켜주세요:
                </p>
                <ul className="info-list">
                    <li>자연광이나 밝은 조명 아래에서 촬영한 사진을 사용해주세요</li>
                    <li>정면을 바라보는 얼굴이 잘 보이는 사진을 사용해주세요</li>
                    <li>화장을 하지 않은 맨 얼굴 사진을 권장합니다</li>
                </ul>
                
                <p className="info-text">
                    분석에는 최대 3분이 소요될 수 있습니다.
                </p>
                
                <p className="info-text important">
                    분석에 사용된 이미지는 어디에도 저장되지 않으며, 분석 후 즉시 삭제됩니다.
                </p>
            </div>
        </div>
    );
}

function ResultPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const result = location.state?.result;

    if (!result) {
        navigate('/');
        return null;
    }

    const calculateRelativeValue = (value, threshold) => {
        // 임계값과의 차이를 -30 ~ +30 범위로 제한
        const difference = value - threshold;
        return Math.max(-10, Math.min(10, difference)); // 차이를 그대로 사용
    };

    const chartData = {
        labels: ['밝기', '웜톤/웜톤', '선명도'],
        datasets: [
            {
                label: '',
                data: [
                    calculateRelativeValue(result.lab_values.L, 160),  // 밝기 임계값: 140
                    calculateRelativeValue((result.lab_values.a * 0.5 + result.lab_values.b * 0.5), 140),  // 웜톤/쿨톤 임계값: 140
                    calculateRelativeValue(Math.sqrt((result.lab_values.a**2 + result.lab_values.b**2)/2), 140)  // 선명도 임계값: 140
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
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
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
            x: {
                beginAtZero: true,
                suggestedMin: -10,
                suggestedMax: 10,
                ticks: {
                    stepSize: 1,
                    callback: function(value) {
                        if (Number.isInteger(value)) {
                            if (value === 0) return '기준값';
                            return value;
                        }
                        return '';
                    }
                },
                grid: {
                    color: context => context.tick.value === 0 ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.1)',
                    drawTicks: true,
                    tickLength: 4,
                    stepSize: 0.5
                }
            }
        },
        barThickness: 23,
        animation: {
            duration: 2000
        }
    };

    const doughnutData = {
        labels: ['밝기', '따뜻함', '선명도'],
        datasets: [{
            data: [
                Math.abs(result.skin_tone.brightness - 160),  // 기준값(140)과의 차이
                Math.abs(result.skin_tone.warmth - 140),
                Math.abs(result.skin_tone.contrast - 140)
            ],
            backgroundColor: [
                'rgba(255, 223, 61, 0.7)',  // 밝기: 노란색
                'rgba(255, 87, 51, 0.7)',   // 따뜻함: 주황색
                'rgba(147, 112, 219, 0.7)'  // 선명도: 보라색
            ],
            borderColor: [
                'rgba(255, 223, 61, 1)',
                'rgba(255, 87, 51, 1)',
                'rgba(147, 112, 219, 1)'
            ],
            borderWidth: 1
        }]
    };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '70%',
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const value = context.raw;
                        const label = context.label;
                        return `${label}: ${value.toFixed(1)}`;
                    }
                }
            }
        }
    };

    // 디버깅을 위한 로그 추가
    console.log('전체 결과:', result);
    console.log('RGB 값:', result?.rgb_values);

    return (
        <div className="container">
            <h1>AI 퍼스널 컬러 분석 결과</h1>
            <div className="result-section">
                <div className="result-title">
                    당신은 <span style={{color: '#FF6B6B'}}>{result.season}</span> 입니다!
                </div>
                
                <div className="keywords-section">
                    <div className="keywords-container">
                        {result.characteristics.map((characteristic, index) => (
                            <span key={index} className="keyword">
                                {characteristic}
                            </span>
                        ))}
                    </div>
                    <div className="skin-tone-chart">
                        <Doughnut data={doughnutData} options={doughnutOptions} />
                    </div>
                </div>

                <div className="chart-section">
                    <Bar data={chartData} options={chartOptions} />
                </div>

                <div className="color-section">
                    <div className={`best-colors ${result.season.split(' ')[0].toLowerCase()}`}>
                        <h3>추천 컬러</h3>
                        <div className="color-boxes">
                            {result.best_colors.map((color, index) => (
                                <div key={index} className="color-box">
                                    <div
                                        style={{
                                            backgroundColor: color.value,
                                            border: '1px solid rgba(0,0,0,0.1)'
                                        }}
                                    />
                                    <span className="color-name">{color.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className={`worst-colors ${result.season.split(' ')[0].toLowerCase()}`}>
                        <h3>피해야 할 컬러</h3>
                        <div className="color-boxes">
                            {result.worst_colors.map((color, index) => (
                                <div key={index} className="color-box">
                                    <div
                                        style={{
                                            backgroundColor: color.value,
                                            border: '1px solid rgba(0,0,0,0.1)'
                                        }}
                                    />
                                    <span className="color-name">{color.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <button 
                    className="upload-button reset"
                    onClick={() => navigate('/')}
                >
                    다시 검사하기
                </button>
            </div>
        </div>
    );
}

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<UploadPage />} />
                <Route path="/result" element={<ResultPage />} />
            </Routes>
        </Router>
    );
}

export default App;
