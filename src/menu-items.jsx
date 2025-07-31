import NavigationOutlinedIcon from '@mui/icons-material/NavigationOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import DirectionsBusOutlinedIcon from '@mui/icons-material/DirectionsBusOutlined';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import MessageOutlinedIcon from '@mui/icons-material/MessageOutlined';

const icons = {
  NavigationOutlinedIcon,
  HomeOutlinedIcon,
  DirectionsBusOutlinedIcon,
  MapOutlinedIcon,
  PeopleAltOutlinedIcon,
  EventAvailableOutlinedIcon,
  AssessmentOutlinedIcon,
  MessageOutlinedIcon
};

export default {
  items: [
    {
      id: 'dashboard',
      title: 'Dashboard',
      caption: 'Overview',
      type: 'group',
      icon: icons['NavigationOutlinedIcon'],
      children: [
        {
          id: 'default',
          title: 'Dashboard',
          type: 'item',
          icon: icons['HomeOutlinedIcon'],
          url: '/dashboard/default'
        }
      ]
    },
    {
      id: 'transportation',
      title: 'Transportation',
      caption: 'Management Tools',
      type: 'group',
      icon: icons['DirectionsBusOutlinedIcon'],
      children: [
        {
          id: 'manage-transport-company',
          title: 'Manage Transport Company',
          type: 'item',
          url: '/manage-transport-company',
          icon: icons['DirectionsBusOutlinedIcon']
        },
        {
          id: 'bus-management',
          title: 'Bus Management',
          type: 'item',
          url: '/views/BusManagement',
          icon: icons['DirectionsBusOutlinedIcon']
        },
        {
          id: 'route-planning',
          title: 'Route Planning',
          type: 'item',
          url: '/views/RoutePlanning',
          icon: icons['MapOutlinedIcon']
        },
        {
          id: 'agent-management',
          title: 'Agent Management',
          type: 'item',
          url: '/views/AgentManagement',
          icon: icons['PeopleAltOutlinedIcon']
        },
        {
          id: 'reservation-tracking',
          title: 'Reservation Tracking',
          type: 'item',
          url: '/views/ReservationTracking',
          icon: icons['EventAvailableOutlinedIcon']
        },
        {
          id: 'reports',
          title: 'Reports',
          type: 'item',
          url: '/views/Reports',
          icon: icons['AssessmentOutlinedIcon']
        },
        {
          id: 'messages',
          title: 'Messages',
          type: 'item',
          url: '/views/Messages',
          icon: icons['MessageOutlinedIcon']
        }
      ]
    }
  ]
};