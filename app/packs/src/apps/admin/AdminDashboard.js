import React, { useEffect, useState } from 'react';
import {
  Panel, Row, Col, Button, OverlayTrigger, Tooltip
} from 'react-bootstrap';
import AdminFetcher from 'src/fetchers/AdminFetcher';

import styles from 'Styles';

function DiskUsageChart({ diskPercentUsed, onRefresh }) {
  const [animatedPercent, setAnimatedPercent] = useState(0);
  const scale = 10;
  const radius = 21 * scale;
  const strokeWidth = 8 * scale;
  const circumference = 2 * Math.PI * radius;
  const offset = ((100 - animatedPercent) / 100) * circumference;
  const usedColor = diskPercentUsed > 80 ? '#ff6361' : '#5C7AEA';
  useEffect(() => {
    const animationDuration = 1000;
    const stepSize = 0.1;
    const totalSteps = diskPercentUsed / stepSize;
    const intervalDelay = animationDuration / totalSteps;
    setAnimatedPercent(0);
    const intervalId = setInterval(() => {
      setAnimatedPercent((prevState) => {
        const newValue = prevState + stepSize;
        if (newValue < diskPercentUsed) {
          return newValue;
        }
        clearInterval(intervalId);
        return diskPercentUsed;
      });
    }, intervalDelay);
    return () => clearInterval(intervalId);
  }, [diskPercentUsed]);

  return (
    <div style={styles.container}>
      <div style={styles.svgContainer}>
        <div>
          <svg width="500px" viewBox="0 0 500 500">
            <circle
              cx="250"
              cy="250"
              r={radius}
              stroke="#DCE3E9"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            <circle
              cx="250"
              cy="250"
              r={radius}
              stroke={usedColor}
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              transform="rotate(-90 250 250)"
            />
            <text x="250" y="250" textAnchor="middle" fill={usedColor} fontSize="4em" fontFamily="Arial" dy=".3em">
              {animatedPercent.toFixed(2)}
              %
            </text>
          </svg>
        </div>
        <div style={{ position: 'absolute', bottom: '20px', right: '20px' }}>
          <OverlayTrigger
            placement="top"
            delay={{ show: 250, hide: 400 }}
            overlay={<Tooltip id="button-tooltip">Refresh Chart</Tooltip>}
          >
            <Button
              variant="primary"
              size="sm"
              onClick={onRefresh}
              style={{ ...styles.amazingBtn, backgroundColor: usedColor }}
            >
              <i className="fa fa-refresh" />
            </Button>
          </OverlayTrigger>
        </div>
      </div>
      <div style={styles.legendContainer}>
        <div style={styles.legendItem}>
          <div style={{ ...styles.legendMarker, backgroundColor: usedColor }} />
          <p style={styles.legendText}>Used</p>
        </div>
        <div style={styles.legendItem}>
          <div style={{ ...styles.legendMarker, backgroundColor: '#DCE3E9' }} />
          <p style={styles.legendText}>Available</p>
        </div>
      </div>
    </div>
  );
}

export default class AdminDashboard extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      diskAvailable: 0,
      diskUsed: 0,
      diskPercentUsed: 0,
      showDiskInfo: false,
      refreshKey: 0
    };
  }

  async componentDidMount() {
    await this.handleDiskSpace();
  }

  handleRefresh = async () => {
    await this.handleDiskSpace();
    this.setState((prevState) => ({ refreshKey: prevState.refreshKey + 1 }));
  };

  async handleDiskSpace() {
    const result = await AdminFetcher.checkDiskSpace();
    const diskTotal = result.mb_available / (1 - result.percent_used / 100);
    const diskUsed = diskTotal - result.mb_available;
    this.setState({
      diskAvailable: result.mb_available,
      diskUsed,
      diskPercentUsed: result.percent_used,
      showDiskInfo: true
    });
  }

  render() {
    const {
      diskAvailable, diskUsed, diskPercentUsed, showDiskInfo, refreshKey
    } = this.state;
    if (!showDiskInfo) return null;

    return (
      <Panel style={styles.panel}>
        <Col sm={12}>
          <Row>
            <Col sm={3}>
              <Panel style={styles.panelItem}>
                <div style={styles.panelItemContent}>
                  <div>Disk Available</div>
                  <div>{`${diskAvailable || ''} MB`}</div>
                </div>
              </Panel>
            </Col>
            <Col sm={3}>
              <Panel style={styles.panelItem}>
                <div style={styles.panelItemContent}>
                  {' '}
                  <div>Disk Used</div>
                  <div>{`${diskUsed.toFixed(2) || ''} MB`}</div>
                </div>
              </Panel>
            </Col>
            <Col sm={3}>
              <Panel style={styles.panelItem}>
                <div style={styles.panelItemContent}>
                  <div>Available Percentage</div>
                  <div>{`${(100 - diskPercentUsed).toFixed(2)}%` || ''}</div>
                </div>
              </Panel>
            </Col>
            <Col sm={3}>
              <Panel style={styles.panelItem}>
                <div style={styles.panelItemContent}>
                  <div>Used Percentage</div>
                  <div style={{ color: diskPercentUsed > 80 ? '#FF4500' : 'default' }}>
                    {`${diskPercentUsed.toFixed(2)}%` || ''}
                  </div>
                </div>
              </Panel>
            </Col>
          </Row>

          <Row>
            <DiskUsageChart key={refreshKey} diskPercentUsed={diskPercentUsed} onRefresh={this.handleRefresh} />
          </Row>
        </Col>
      </Panel>
    );
  }
}
