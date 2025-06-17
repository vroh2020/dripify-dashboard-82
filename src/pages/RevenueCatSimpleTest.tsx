import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react'
import { RevenueCatSimpleTest } from '../components/RevenueCatSimpleTest'

const RevenueCatSimpleTestPage: React.FC = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>RevenueCat Simple Test</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <RevenueCatSimpleTest />
      </IonContent>
    </IonPage>
  )
}

export default RevenueCatSimpleTestPage 