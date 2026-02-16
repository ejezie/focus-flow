// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<string, ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = string;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'chevron.left': 'chevron-left',
  'calendar': 'calendar-today',
  'flag.fill': 'flag',
  'clock.fill': 'schedule',
  'chart.bar.fill': 'bar-chart',
  'plus': 'add',
  'plus.circle.fill': 'add-circle',
  'sparkles': 'auto-fix-high',
  'timer': 'timer',
  'bolt.fill': 'bolt',
  'trophy.fill': 'emoji-events',
  'flame.fill': 'whatshot',
  'star.fill': 'star',
  'bell.fill': 'notifications',
  'gearshape.fill': 'settings',
  'square.and.arrow.up': 'share',
  'arrow.counterclockwise': 'refresh',
  'trash.fill': 'delete',
  'lock.fill': 'lock',
  'envelope.fill': 'email',
  'checkmark.circle.fill': 'check-circle',
  'xmark': 'close',
  'play.fill': 'play-arrow',
  'pause.fill': 'pause',
  'forward.fill': 'skip-next',
  'sparkles.tv.fill': 'live-tv',
  'calendar.badge.clock': 'event-note',
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: any;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
