import { useFonts } from 'expo-font';
import {
    Caveat_400Regular,
    Caveat_500Medium,
    Caveat_700Bold
} from '@expo-google-fonts/caveat';
import {
    IndieFlower_400Regular
} from '@expo-google-fonts/indie-flower';

export const useAppFonts = () => {
    const [fontsLoaded] = useFonts({
        'GasoekOne': Caveat_400Regular,
        'GasoekOne': Caveat_500Medium,
        'GasoekOne': Caveat_700Bold,
        'GasoekOne': IndieFlower_400Regular,
    });

    return fontsLoaded;
};
