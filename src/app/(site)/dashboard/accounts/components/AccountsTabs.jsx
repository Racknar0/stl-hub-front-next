import React from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import CloudOutlinedIcon from '@mui/icons-material/CloudOutlined';
import BackupOutlinedIcon from '@mui/icons-material/BackupOutlined';

export default function AccountsTabs({ tab, onChange, mainCount, backupCount }) {
  return (
    <Box sx={{ mb: 1.5, borderBottom: '1px solid rgba(148,163,184,.24)' }}>
      <Tabs
        value={tab}
        onChange={(e,v)=>onChange(v)}
        sx={{
          minHeight:36,
          '& .MuiTab-root':{color:'rgba(255,255,255,0.65)',textTransform:'none',fontWeight:500,minHeight:36,padding:'6px 16px'},
          '& .MuiTab-root.Mui-selected':{color:'#7dd3fc'},
          '& .MuiTabs-indicator':{backgroundColor:'#38bdf8',height:3}
        }}
      >
        <Tab disableRipple value="main" icon={<CloudOutlinedIcon sx={{ fontSize: 18 }} />} iconPosition="start" label={`Main (${mainCount})`} />
        <Tab disableRipple value="backup" icon={<BackupOutlinedIcon sx={{ fontSize: 18 }} />} iconPosition="start" label={`Backups (${backupCount})`} />
      </Tabs>
    </Box>
  );
}
