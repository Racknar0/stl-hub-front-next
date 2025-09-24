import React from 'react';
import { Box, Tabs, Tab } from '@mui/material';

export default function AccountsTabs({ tab, onChange, mainCount, backupCount }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Tabs
        value={tab}
        onChange={(e,v)=>onChange(v)}
        sx={{
          minHeight:36,
          '& .MuiTab-root':{color:'rgba(255,255,255,0.65)',textTransform:'none',fontWeight:500,minHeight:36,padding:'6px 16px'},
          '& .MuiTab-root.Mui-selected':{color:'#fff'},
          '& .MuiTabs-indicator':{backgroundColor:'#fff',height:3,borderRadius:2}
        }}
      >
        <Tab disableRipple value="main" label={`Main (${mainCount})`} />
        <Tab disableRipple value="backup" label={`Backups (${backupCount})`} />
      </Tabs>
    </Box>
  );
}
