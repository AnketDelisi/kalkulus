import { describe, expect, it } from 'vitest';
import {
  getBattlegroundMarginColor,
  getContrastTextColor,
  getDivergingSwingColor,
  getDynamicPartyBoxTheme,
  getPartyHeatmapColor,
  interpolateHex,
} from '../color';

describe('Color utilities & map scales', () => {
  it('interpolates hex colors cleanly at 0, 0.5, and 1', () => {
    expect(interpolateHex('#000000', '#FFFFFF', 0)).toBe('#000000');
    expect(interpolateHex('#000000', '#FFFFFF', 1)).toBe('#FFFFFF');
    expect(interpolateHex('#000000', '#FFFFFF', 0.5)).toBe('#808080');
  });

  it('produces distinct battleground margin colors from toss-up to safe', () => {
    const tossup = getBattlegroundMarginColor(0.5);
    const competitive = getBattlegroundMarginColor(3.5);
    const safe = getBattlegroundMarginColor(25);
    expect(tossup).not.toBe(competitive);
    expect(competitive).not.toBe(safe);
    expect(safe).toBe('#1E293B');
  });

  it('produces diverging swing colors centered on #F1F5F9', () => {
    expect(getDivergingSwingColor(0.05)).toBe('#F1F5F9');
    expect(getDivergingSwingColor(6)).not.toBe(getDivergingSwingColor(-6));
  });

  it('produces sequential party heatmap colors from #F1F5F9 to partyHex', () => {
    expect(getPartyHeatmapColor('#ED1C24', 0)).toBe('#F1F5F9');
    expect(getPartyHeatmapColor('#ED1C24', 50)).toBe('#ED1C24');
  });

  it('picks high-contrast ink for light and dark backgrounds', () => {
    expect(getContrastTextColor('#090A0F')).toBe('#FFFFFF');
    expect(getContrastTextColor('#FDE047')).toBe('#090A0F');
  });

  it('builds uniform party box themes with party color bg and white ink', () => {
    expect(getDynamicPartyBoxTheme('YENI', '#ED1C24')).toEqual({
      bg: '#ED1C24',
      fg: '#FFFFFF',
      border: '#ED1C24',
    });
    expect(getDynamicPartyBoxTheme('IYI', '#0EA5E9')).toEqual({
      bg: '#0EA5E9',
      fg: '#FFFFFF',
      border: '#0EA5E9',
    });
    expect(getDynamicPartyBoxTheme('AKP', '#F59300')).toEqual({
      bg: '#F59300',
      fg: '#FFFFFF',
      border: '#F59300',
    });
  });
});
