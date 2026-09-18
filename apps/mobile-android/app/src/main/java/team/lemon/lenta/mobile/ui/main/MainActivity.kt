package team.lemon.lenta.mobile.ui.main

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import team.lemon.lenta.mobile.ui.theme.LemonLentaTheme

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            LemonLentaTheme {
                MainScreen()
            }
        }
    }
}
