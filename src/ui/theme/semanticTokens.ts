import { SHADOWS } from './shadows';

export const CURRENT_SEMANTIC_TOKENS = {
  colors: {
    brand: { value: '#FC6432' },
    borderPrimary: {
      value: { base: '{colors.slate.250}', _dark: '{colors.slate.850}' },
    },
    borderSecondary: {
      value: { base: '{colors.slate.150}', _dark: '{colors.slate.900}' },
    },
    error: {
      value: { base: '{colors.red.600}', _dark: '{colors.red.500}' },
    },
    minorError: {
      value: { base: '{colors.orange.500}', _dark: '{colors.orange.600}' },
    },
    success: {
      value: { base: '{colors.green.600}', _dark: '{colors.green.500}' },
    },
    surface: {
      value: { base: '{colors.white}', _dark: '{colors.black}' },
    },
    surfaceOpposite: {
      value: { base: '{colors.black}', _dark: '{colors.white}' },
    },
    surfaceHighlight: {
      value: { base: '{colors.slate.150}', _dark: '{colors.slate.900}' },
    },
    surfaceTertiary: {
      value: { base: '{colors.neutral.sand-50}', _dark: '{colors.black}' },
    },
    text: {
      value: { base: '{colors.slate.900}', _dark: '{colors.slate.50}' },
    },
    textSubdued: {
      value: { base: '{colors.slate.700}', _dark: '{colors.slate.600}' },
    },
    buttonText: {
      value: { base: '{colors.brand}', _dark: '{colors.purple.400}' },
    },
    interactive: {
      value: { base: '{colors.purple.600}', _dark: '{colors.purple.400}' },
    },
    hoverBackground: {
      value: { base: '{colors.slate.150}', _dark: '{colors.slate.850}' },
    },
    icon: {
      value: { base: '{colors.slate.900}', _dark: '{colors.slate.50}' },
    },
    iconSubdued: {
      value: { base: '{colors.slate.700}', _dark: '{colors.slate.600}' },
    },
    invert: {
      value: { base: '{colors.black}', _dark: '{colors.white}' },
    },
    table: {
      header: {
        background: {
          value: { base: '{colors.slate.150}', _dark: '{colors.slate.850}' },
        },
        text: {
          value: { base: '{colors.slate.700}', _dark: '{colors.slate.250}' },
        },
      },
    },
    // TODO: In a lot of cases, this object notation can be used in-line, so we can remove all of these and just use the object notation. But perhaps we wait to do this until after the redesign
    blockList: {
      btcBlockRowText: {
        value: { base: '{colors.slate.700}', _dark: '{colors.slate.500}' },
      },
      btcBlockRowIcon: {
        value: { base: '{colors.slate.600}', _dark: '{colors.slate.800}' },
      },
      blockCount: {
        background: {
          value: { base: '{colors.purple.100}', _dark: '{colors.slate.900}' },
        },
        backgroundHover: {
          value: { base: '{colors.purple.200}', _dark: '{colors.purple.850}' },
        },
        text: {
          value: { base: '{colors.purple.600}', _dark: '{colors.purple.400}' },
        },
        icon: {
          value: { base: '{colors.purple.600}', _dark: '{colors.purple.200}' },
        },
      },
      updateBar: {
        background: { value: { base: '{colors.purple.100}', _dark: '{colors.slate.900}' } },
        text: { value: { base: '{colors.slate.800}', _dark: '{colors.slate.400}' } },
      },
    },
    navbar: {
      logo: {
        icon: {
          value: { base: '{colors.neutral.sand-50}', _dark: '{colors.neutral.sand-1000}' },
        },
        bg: {
          value: { base: '{colors.neutral.sand-1000}', _dark: '{colors.neutral.sand-100}' },
        },
      },
      control: {
        bg: {
          value: { base: '{colors.neutral.sand-200}', _dark: '{colors.neutral.sand-900}' },
        },
      },
      menu: {
        bg: {
          value: { base: '{colors.neutral.sand-200}', _dark: '{colors.neutral.sand-900}' },
        },
        menuItem: {
          bg: {
            value: { base: '{colors.neutral.sand-50}', _dark: '{colors.black}' },
          },
        },
      },
      listIconHoverBg: {
        value: { base: '{colors.neutral.sand-600}', _dark: '{colors.neutral.sand-700}' },
      },
      dropdownBg: {
        value: { base: '{colors.neutral.sand-200}', _dark: '{colors.neutral.sand-700}' },
      },
      // this is the same as the time filter
      networkLabelBadge: {
        value: { base: '{colors.purple.600}', _dark: '{colors.purple.300}' },
      },
      networkLabelBadgeBackground: {
        value: { base: '{colors.purple.100}', _dark: '{colors.purple.900}' },
      },
      networkLabelBadgeBorder: {
        value: { base: '{colors.purple.300}', _dark: '{colors.purple.700}' },
      },
    },
    timeFilter: {
      // this is the same as the navbar
      text: {
        value: { base: '{colors.purple.600}', _dark: '{colors.purple.300}' },
      },
      background: {
        value: { base: '{colors.purple.100}', _dark: '{colors.purple.900}' },
      },
      border: {
        value: { base: '{colors.purple.300}', _dark: '{colors.purple.700}' },
      },
    },
    statusPage: {
      incidentImpact: {
        value: { base: '{colors.purple.400}', _dark: '{colors.purple.600}' },
      },
      text: {
        value: { base: '{colors.slate.50}', _dark: '{colors.slate.900}' },
      },
      border: {
        value: { base: '{colors.slate.850}', _dark: '{colors.slate.250}' },
      },
    },
    stackingPercentageProgressColor: {
      value: { base: '{colors.brand}', _dark: '{colors.purple.400}' },
    },
    sandbox: {
      navItem: {
        selectedBackground: {
          value: { base: '{colors.slate.150}', _dark: '{colors.slate.800}' },
        },
        hoverBackground: {
          value: { base: '{colors.slate.100}', _dark: '{colors.slate.900}' },
        },
        border: {
          value: { base: '{colors.slate.150}', _dark: '{colors.slate.900}' },
        },
      },
    },
    signers: {
      currentCycle: {
        fill: {
          value: { base: '{colors.purple.200}', _dark: '{colors.purple.850}' },
        },
      },
      progressBar: {
        progressColor: {
          value: {
            base: `linear-gradient(to right, {colors.mode.600} 0%, {colors.mode.400} 100%)`,
            _dark: `linear-gradient(to right, {colors.mode.500}, {colors.mode.400})`,
          },
        },
        backgroundColor: {
          value: { base: '{colors.mode.200}', _dark: '{colors.mode.850}' }, // TODO: fix. There is no mode.200/850
        },
      },
      legendItem: {
        unknownSigner: {
          value: { base: '{colors.slate.250}', _dark: '{colors.slate.800}' },
        },
      },
      continentPill: {
        activeBackgroundColor: {
          value: { base: '{colors.purple.100}', _dark: '{colors.slate.850}' },
        },
        activeTextColor: {
          value: { base: '{colors.purple.600}', _dark: '{colors.purple.400}' },
        },
      },
    },
    transactions: {
      mempoolFeePieChart: {
        label: {
          value: { base: '{colors.slate.700}', _dark: '{colors.slate.500}' },
        },
      },
      mempoolFeePriorityCard: {
        borderColor: {
          value: { base: '{colors.slate.200}', _dark: '{colors.slate.800}' },
        },
        textColor: {
          value: { base: '{colors.slate.700}', _dark: '{colors.slate.500}' },
        },
      },
    },
    filterMenu: {
      borderColor: {
        value: { base: '{colors.slate.300}', _dark: '{colors.slate.900}' },
      },
    },
    stxPrice: {
      background: {
        value: { base: '{colors.purple.200}', _dark: '{colors.purple.400}' },
      },
      hoverBackground: {
        value: { base: '{colors.purple.300}', _dark: '{colors.purple.300}' },
      },
    },
    filterButton: {
      hoverBackground: {
        value: { base: '{colors.slate.100}', _dark: '{colors.slate.800}' },
      },
      borderColor: {
        value: { base: '{colors.slate.300}', _dark: '{colors.slate.900}' },
      },
    },
    cycleFilter: {
      iconButton: {
        backgroundColor: {
          value: { base: '{colors.gray.100}', _dark: '{colors.whiteAlpha.200}' },
        },
        hoverBackgroundColor: {
          value: { base: '{colors.gray.200}', _dark: '{colors.whiteAlpha.300}' },
        },
      },
    },
    stacksSmiley: {
      eyeColor: {
        value: { base: '#FD6112', _dark: '#141414' },
      },
      circleColor: {
        value: { base: '#F7F6F5', _dark: '#0C0C0D' },
      },
      linearGradientColor: {
        value: { base: '#E5E0DC', _dark: '#3C3A38' },
      },
    },
    stacksNameAndLogo: {
      value: { base: '{colors.neutral.sand-1000}', _dark: '{colors.neutral.sand-50}' },
    },
  },
};

export const NEW_SEMANTIC_TOKENS = {
  colors: {
    redesignBorderPrimary: {
      value: { base: '{colors.neutral.sand-300}', _dark: '{colors.neutral.sand-600}' },
    },
    redesignBorderSecondary: {
      value: { base: '{colors.neutral.sand-200}', _dark: '{colors.neutral.sand-700}' },
    },
    borderTertiary: {
      value: { base: '{colors.neutral.sand-100}', _dark: '{colors.neutral.sand-950}' },
    },
    iconPrimary: {
      value: { base: '{colors.neutral.sand-1000}', _dark: '{colors.neutral.sand-100}' },
    },
    iconSecondary: {
      value: { base: '{colors.neutral.sand-600}', _dark: '{colors.neutral.sand-400}' },
    },
    iconTertiary: {
      value: { base: '{colors.neutral.sand-400}', _dark: '{colors.neutral.sand-500}' },
    },
    iconInvert: {
      value: { base: '{colors.neutral.sand-50}', _dark: '{colors.neutral.sand-1000}' },
    },
    iconError: {
      value: { base: '{colors.feedback.red-500}', _dark: '{colors.feedback.red-400}' },
    },
    iconSuccess: {
      value: { base: '{colors.feedback.green-500}', _dark: '{colors.feedback.green-400}' },
    },
    iconBitcoin: {
      value: { base: '{colors.accent.bitcoin-600}', _dark: '{colors.accent.bitcoin-500}' },
    },
    surfacePrimary: {
      value: { base: '{colors.neutral.sand-150}', _dark: '{colors.neutral.sand-900}' },
    },
    surfaceSecondary: {
      value: { base: '{colors.neutral.sand-100}', _dark: '{colors.neutral.sand-950}' },
    },
    surfaceTertiary: {
      value: { base: '{colors.neutral.sand-50}', _dark: '{colors.neutral.sand-1000}' },
    },
    surfaceFourth: {
      value: { base: '{colors.white}', _dark: '{colors.neutral.sand-800}' },
    },
    surfaceFifth: {
      value: { base: '{colors.neutral.sand-200}', _dark: '{colors.neutral.sand-700}' },
    },
    surfaceInvert: {
      value: { base: '{colors.neutral.sand-800}', _dark: '{colors.neutral.sand-100}' },
    },
    textPrimary: {
      value: { base: '{colors.neutral.sand-1000}', _dark: '{colors.neutral.sand-100}' },
    },
    textSecondary: {
      value: { base: '{colors.neutral.sand-600}', _dark: '{colors.neutral.sand-400}' },
    },
    textTertiary: {
      value: { base: '{colors.neutral.sand-400}', _dark: '{colors.neutral.sand-500}' },
    },
    textInteractiveHover: {
      value: { base: '{colors.accent.stacks-600}', _dark: '{colors.accent.stacks-400}' },
    },
    textInvert: {
      value: { base: '{colors.neutral.sand-50}', _dark: '{colors.neutral.sand-1000}' },
    },
    textError: {
      value: { base: '{colors.feedback.red-500}', _dark: '{colors.feedback.red-400}' },
    },
    signerHealth: {
      lowSurface: {
        value: { base: '{colors.feedback.red-100}', _dark: '{colors.feedback.red-900}' },
      },
      lowAccent: {
        value: { base: '{colors.feedback.red-500}', _dark: '{colors.feedback.red-200}' },
      },
      mediumSurface: {
        value: { base: '{colors.feedback.yellow-100}', _dark: '{colors.feedback.yellow-900}' },
      },
      mediumAccent: {
        value: { base: '{colors.feedback.yellow-700}', _dark: '{colors.feedback.yellow-200}' },
      },
      highSurface: {
        value: { base: '{colors.feedback.green-100}', _dark: '{colors.feedback.green-900}' },
      },
      highAccent: {
        value: { base: '{colors.feedback.green-600}', _dark: '{colors.feedback.green-200}' },
      },
    },
    signerProposal: {
      approved: {
        value: { base: '{colors.feedback.green-500}', _dark: '{colors.feedback.green-400}' },
      },
      rejected: {
        value: { base: '{colors.feedback.red-500}', _dark: '{colors.feedback.red-400}' },
      },
    },
    transactionStatus: {
      failed: {
        value: { base: '{colors.feedback.red-150}', _dark: '{colors.feedback.red-900}' },
      },
      pending: {
        value: { base: '{colors.feedback.bronze-200}', _dark: '{colors.feedback.bronze-900}' },
      },
      confirmed: {
        value: { base: '{colors.feedback.green-150}', _dark: '{colors.feedback.green-900}' },
      },
    },
    transactionTypes: {
      contractCall: {
        value: { base: '{colors.secondary.moss-200}', _dark: '{colors.secondary.moss-400}' },
      },
      contractDeploy: {
        value: { base: '{colors.secondary.lime-200}', _dark: '{colors.secondary.lime-400}' },
      },
      tokenTransfer: {
        value: { base: '{colors.secondary.peach-200}', _dark: '{colors.secondary.peach-400}' },
      },
      tenureChange: {
        value: { base: '{colors.secondary.pink-200}', _dark: '{colors.secondary.pink-400}' },
      },
      coinbase: {
        value: {
          base: '{colors.secondary.blood-orange-200}',
          _dark: '{colors.secondary.blood-orange-400}',
        },
      },
    },
  },
};

export const SEMANTIC_TOKENS = {
  colors: {
    ...CURRENT_SEMANTIC_TOKENS.colors,
    ...NEW_SEMANTIC_TOKENS.colors,
  },
  shadows: {
    ...SHADOWS,
  },
};
