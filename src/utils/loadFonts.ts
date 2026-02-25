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
        'Caveat-Regular': Caveat_400Regular,
        'Caveat-Medium': Caveat_500Medium,
        'Caveat-Bold': Caveat_700Bold,
        'IndieFlower-Regular': IndieFlower_400Regular,
    });

    return fontsLoaded;
};
