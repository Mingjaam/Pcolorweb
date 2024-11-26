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

    const handleDragOver = (e) => {
        e.preventDefault();
        e.currentTarget.classList.add('dragover');
    };

    const handleDragLeave = (e) => {
        e.currentTarget.classList.remove('dragover');
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
        
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            setImage(file);
        } else {
            alert('이미지 파일만 업로드 가능합니다.');
        }
    };

    return (
        <div className="container">
            <section className="service-intro">
                <h1>AI 퍼스널 컬러 분석</h1>
                <p>
                    AI 이미지 분석 기술로 당신만의 퍼스널 컬러를 찾아보세요.<br/>
                    얼굴 사진 하나로 피부톤을 분석하고 어울리는 컬러를 추천해드립니다.
                </p>
                <div className="service-features">
                    <div className="feature">
                        <svg 
                            className="feature-icon" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                        >
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                            <polyline points="22 4 12 14.01 9 11.01"/>
                        </svg>
                        <h3>정확한 분석</h3>
                        <p>AI 이미지 처리 기술로<br/>피부톤을 정밀하게 분석</p>
                    </div>
                    <div className="feature">
                        <svg 
                            className="feature-icon" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                        >
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                            <polyline points="7.5 4.21 12 6.81 16.5 4.21"/>
                            <polyline points="7.5 19.79 7.5 14.6 3 12"/>
                            <polyline points="21 12 16.5 14.6 16.5 19.79"/>
                            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                            <line x1="12" y1="22.08" x2="12" y2="12"/>
                        </svg>
                        <h3>맞춤 추천</h3>
                        <p>분석 결과에 따른<br/>맞춤형 컬러 팔레트 제공</p>
                    </div>
                    <div className="feature">
                        <svg 
                            className="feature-icon" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                        >
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="16" x2="12" y2="12"/>
                            <line x1="12" y1="8" x2="12.01" y2="8"/>
                        </svg>
                        <h3>즉시 확인</h3>
                        <p>분석 결과를 차트와 함께<br/>한눈에 확인</p>
                    </div>
                    <div className="feature">
                        <svg 
                            className="feature-icon" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                        >
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        </svg>
                        <h3>안전한 분석</h3>
                        <p>이미지는 분석 후<br/>즉시 삭제됩니다</p>
                    </div>
                </div>
            </section>

            <section className="upload-section">
                <div className={`upload-box ${image ? 'has-image' : ''}`}>
                    <label htmlFor="image-upload" className="upload-label">
                        <svg 
                            className="upload-icon" 
                            width="50" 
                            height="50" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                        >
                            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        <span className="upload-text">
                            {image ? '이미지 변경하기' : '이미지 업로드하기'}
                        </span>
                    </label>
                    <input
                        id="image-upload"
                        type="file"
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden-input"
                    />
                    {image && (
                        <img 
                            src={URL.createObjectURL(image)} 
                            alt="업로드된 이미지 미리보기" 
                            className="preview-image"
                        />
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
                    <>
                        <section className="result-section">
                            <div className="result-title">
                                당신은 <span style={{color: '#FF6B6B'}}>{analysisResult.season}</span> 입니다!
                            </div>
                            <div className="keywords-section">
                                <div className="keywords-container">
                                    {analysisResult.characteristics.map((characteristic, index) => (
                                        <span key={index} className="keyword">
                                            {characteristic}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="color-section">
                                <div className={`best-colors ${analysisResult.season.split(' ')[0].toLowerCase()}`}>
                                    <h3>추천 컬러</h3>
                                    <div className="color-boxes">
                                        {analysisResult.best_colors.map((color, index) => (
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
                        </section>
                        <button 
                            className="upload-button result"
                            onClick={() => navigate('/result', { state: { result: analysisResult } })}
                        >
                            결과 상세보기
                        </button>
                    </>
                )}
            </section>

            <section className="analysis-explanation">
                <h3>AI 분석 프로세스</h3>
                <p>
                    본 서비스는 컴퓨터 비전과 머신러닝 기술을 활용하여 다음과 같은 과정으로 분석을 진행합니다:
                </p>
                <ul className="analysis-steps">
                    <li>얼굴 영역 검출 및 피부톤 추출
                        <p>- Haar Cascade 알고리즘을 사용하여 얼굴을 감지하고 T존과 U존으로 분리</p>
                    </li>
                    <li>피부톤 분석을 위한 전처리
                        <p>- 조명 보정 및 그림자 영향 최소화</p>
                        <p>- 피부색 마스크를 생성하여 피부 영역만 추출</p>
                    </li>
                    <li>Lab 색공간에서의 색상값 분석
                        <p>- L(명도), a(붉은/녹색), b(노란/파란) 값 측정</p>
                        <p>- T존과 U존의 가중 평균값 계산</p>
                    </li>
                    <li>퍼스널 컬러 특성 분석
                        <p>- 밝기(명도): 매우 밝음 ~ 어두움</p>
                        <p>- 따뜻함(색상): 매우 따뜻함 ~ 매우 차가움</p>
                        <p>- 선명도(채도): 매우 선명함 ~ 뮤트함</p>
                    </li>
                    <li>퍼스널 컬러 시즌 판정
                        <p>- 봄/여름/가을/겨울 웜톤/쿨톤 분류</p>
                        <p>- 브라이트/라이트/딥/뮤트 세부 유형 판정</p>
                    </li>
                </ul>
                <p>
                    분석 결과는 조명, 카메라 설정, 화장 여부 등에 따라 달라질 수 있으며,
                    전문가의 대면 진단을 완전히 대체할 수는 없습니다.
                </p>
            </section>
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
                
                <a 
                    href="https://www.instagram.com/dev_.min/profilecard/?igsh=MW40YnFiNm4wYmY4ag=="
                    target="_blank"
                    rel="noopener noreferrer"
                    className="instagram-button"
                >
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                    개발자 인스타그램
                </a>
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

    // 디버깅을 위 로그 추가
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

                <div className="button-group">
                    <button 
                        className="upload-button reset"
                        onClick={() => navigate('/')}
                    >
                        다시 검사하기
                    </button>
                    <a 
                        href="https://www.instagram.com/dev_.min/profilecard/?igsh=MW40YnFiNm4wYmY4ag=="
                        target="_blank"
                        rel="noopener noreferrer"
                        className="instagram-button result"
                    >
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                        </svg>
                        개발자 인스타그램
                    </a>
                </div>
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
