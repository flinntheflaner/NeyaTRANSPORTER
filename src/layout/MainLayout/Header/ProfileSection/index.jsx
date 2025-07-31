import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import {
  Fade,
  Button,
  ClickAwayListener,
  Paper,
  Popper,
  List,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  Box,
  IconButton,
  Tooltip
} from '@mui/material';
import PersonTwoToneIcon from '@mui/icons-material/PersonTwoTone';
import MeetingRoomTwoToneIcon from '@mui/icons-material/MeetingRoomTwoTone';
import AccountCircleTwoToneIcon from '@mui/icons-material/AccountCircleTwoTone';
import LanguageIcon from '@mui/icons-material/Language';
import { useTranslation, useLanguage } from './LanguageContext';

const ProfileSection = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { language, toggleLanguage } = useLanguage();
  const [selectedIndex, setSelectedIndex] = React.useState(1);
  const [open, setOpen] = React.useState(false);
  const anchorRef = React.useRef(null);
  const prevOpen = React.useRef(open);

  const handleListItemClick = (event, index, route) => {
    setSelectedIndex(index);
    setOpen(false);
    if (route) {
      navigate(route);
    }
  };

  const handleToggle = () => {
    setOpen((prevOpen) => !prevOpen);
  };

  const handleClose = (event) => {
    if (
      anchorRef.current &&
      event.target instanceof Node &&
      anchorRef.current.contains(event.target)
    ) {
      return;
    }
    setOpen(false);
  };

  const handleLanguageToggle = () => {
    toggleLanguage();
  };

  React.useEffect(() => {
    if (prevOpen.current && !open) {
      anchorRef.current?.focus();
    }
    prevOpen.current = open;
  }, [open]);

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Tooltip title={t('profile_toggleLanguageTooltip')}>
          <IconButton
            color="inherit"
            onClick={handleLanguageToggle}
            aria-label={t('profile_toggleLanguage')}
            sx={{ mr: 1 }}
          >
            <LanguageIcon />
            <Box component="span" sx={{ ml: 1, fontWeight: 'bold', fontSize: 14 }}>
              {language ? language.toUpperCase() : ''}
            </Box>
          </IconButton>
        </Tooltip>
        <Button
          sx={{ minWidth: { sm: 50, xs: 35 } }}
          ref={anchorRef}
          aria-controls={open ? 'menu-list-grow' : undefined}
          aria-haspopup="true"
          aria-label={t('profile_profile')}
          onClick={handleToggle}
          color="inherit"
        >
          <AccountCircleTwoToneIcon sx={{ fontSize: '1.5rem' }} />
        </Button>
      </Box>
      <Popper
        placement="bottom-end"
        open={open}
        anchorEl={anchorRef.current}
        role={undefined}
        transition
        disablePortal
        modifiers={[
          {
            name: 'offset',
            options: {
              offset: [0, 10]
            }
          },
          {
            name: 'preventOverflow',
            options: {
              altAxis: true
            }
          }
        ]}
      >
        {({ TransitionProps }) => (
          <Fade {...TransitionProps}>
            <Paper>
              <ClickAwayListener onClickAway={handleClose}>
                <List
                  sx={{
                    width: '100%',
                    maxWidth: 350,
                    minWidth: 250,
                    backgroundColor: theme.palette.background.paper,
                    pb: 0,
                    borderRadius: '10px'
                  }}
                >
                  <ListItemButton
                    selected={selectedIndex === 1}
                    onClick={(event) => handleListItemClick(event, 1, '/application/profile')}
                  >
                    <ListItemIcon>
                      <PersonTwoToneIcon />
                    </ListItemIcon>
                    <ListItemText primary={t('profile_profile')} />
                  </ListItemButton>
                  <ListItemButton
                    selected={selectedIndex === 4}
                    onClick={(event) => handleListItemClick(event, 4, '/application/logout')}
                  >
                    <ListItemIcon>
                      <MeetingRoomTwoToneIcon />
                    </ListItemIcon>
                    <ListItemText primary={t('profile_logout')} />
                  </ListItemButton>
                </List>
              </ClickAwayListener>
            </Paper>
          </Fade>
        )}
      </Popper>
    </>
  );
};

export default ProfileSection;