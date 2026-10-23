/**
 * RENALIS i18n Localization Dictionaries
 * Digital Twin Challenge 2026
 *
 * Provides translation dictionaries for English (en), Hindi (hi), and Marathi (mr)
 * covering all patient screens, navigation, common labels, and emergency notices.
 */

export type AppLanguage = 'en' | 'hi' | 'mr';

export interface Translations {
  // Navigation & TopBar
  navHome: string;
  navLogToday: string;
  navKidneyHealth: string;
  navLanguageHelp: string;
  navPatients: string;
  navPatientIntake: string;
  navReferralQueue: string;
  navFollowUps: string;
  navReports: string;
  sectionYourCare: string;
  sectionCareTeam: string;
  viewAs: string;
  rolePatient: string;
  roleCareTeam: string;
  patientPickerLabel: string;
  patientPickerPlaceholder: string;
  demoNotice: string;

  // Help Box in Sidebar
  helpBoxTitle: string;
  helpBoxDesc: string;
  helpBoxLink: string;

  // Common UI & States
  refresh: string;
  refreshing: string;
  retry: string;
  save: string;
  saving: string;
  saved: string;
  cancel: string;
  open: string;
  loading: string;
  noData: string;
  notRecorded: string;
  serverOfflineTitle: string;
  serverOfflineDesc: string;
  serverOfflineHelp: string;

  // Home Page
  homeTitle: string;
  homeSubtitle: string;
  kidneyScoreLabel: string;
  latestBpLabel: string;
  nextFollowUpLabel: string;
  scheduledOn: string;
  noScheduledFollowUp: string;
  dailyCheckinTitle: string;
  dailyCheckinDesc: string;
  todayLogSummaryTitle: string;
  loggedToday: string;
  notLoggedToday: string;
  logNowButton: string;
  recentLogsTitle: string;
  recentLogsSubtitle: string;
  dateCol: string;
  bpCol: string;
  symptomsCol: string;
  medsCol: string;
  statusCol: string;

  // Log Today Page
  logTodayTitle: string;
  logTodaySubtitle: string;
  systolicLabel: string;
  diastolicLabel: string;
  stepsLabel: string;
  medsTakenLabel: string;
  medsTakenPrompt: string;
  symptomsLabel: string;
  sympSwelling: string;
  sympShortBreath: string;
  sympFatigue: string;
  sympNausea: string;
  sympNone: string;
  saveLogButton: string;
  logSuccessTitle: string;
  logSuccessMsg: string;
  urgentAlertTitle: string;
  urgentAlertCall112: string;

  // Kidney Health Page
  kidneyHealthTitle: string;
  kidneyHealthSubtitle: string;
  chartTitle: string;
  measuredLineLabel: string;
  projectedLineLabel: string;
  uncertaintyBandLabel: string;
  monthAxisLabel: string;
  egfrAxisLabel: string;
  plainSummaryTitle: string;
  driversTitle: string;
  notDiagnosisTitle: string;
  notDiagnosisText: string;

  // Language & Help Page
  langHelpTitle: string;
  langHelpSubtitle: string;
  yourLanguageTitle: string;
  yourLanguageDesc: string;
  textSizeTitle: string;
  textSizeStandard: string;
  textSizeLarger: string;
  textSizePreview: string;
  healthWorkerTitle: string;
  healthWorkerRole: string;
  healthWorkerDesc: string;
  healthWorkerHours: string;
  healthWorkerCallBtn: string;
  healthWorkerDemoNotice: string;
  urgentHelpTitle: string;
  urgentHelpText: string;
  emergencyCallBtn: string;
}

export const translations: Record<AppLanguage, Translations> = {
  en: {
    navHome: 'Home',
    navLogToday: 'Log today',
    navKidneyHealth: 'My kidney health',
    navLanguageHelp: 'Language & help',
    navPatients: 'Patients',
    navPatientIntake: 'Patient intake',
    navReferralQueue: 'Referral queue',
    navFollowUps: 'Follow-ups',
    navReports: 'Reports',
    sectionYourCare: 'YOUR CARE',
    sectionCareTeam: 'CARE TEAM',
    viewAs: 'View as:',
    rolePatient: 'Patient',
    roleCareTeam: 'Care team',
    patientPickerLabel: 'Active Patient ID',
    patientPickerPlaceholder: 'Search synthetic patient ID...',
    demoNotice: 'Demo only: all patient data is synthetic · Non-clinical research prototype',

    helpBoxTitle: 'Here to help',
    helpBoxDesc: 'Speak with your health worker.',
    helpBoxLink: 'Call health worker →',

    refresh: 'Refresh',
    refreshing: 'Refreshing...',
    retry: 'Retry connection',
    save: 'Save',
    saving: 'Saving...',
    saved: 'Saved successfully',
    cancel: 'Cancel',
    open: 'Open',
    loading: 'Loading...',
    noData: 'No data recorded yet',
    notRecorded: '–',
    serverOfflineTitle: "Server isn't reachable",
    serverOfflineDesc: 'Unable to connect to the RENALIS backend at http://127.0.0.1:8000.',
    serverOfflineHelp: 'Please check that the FastAPI server is running with: uvicorn app.main:app --reload',

    homeTitle: 'Home',
    homeSubtitle: 'Synthetic Patient',
    kidneyScoreLabel: 'Kidney score (eGFR)',
    latestBpLabel: 'Latest blood pressure',
    nextFollowUpLabel: 'Next care follow-up',
    scheduledOn: 'Scheduled for',
    noScheduledFollowUp: 'No upcoming follow-up scheduled.',
    dailyCheckinTitle: 'Daily health check-in',
    dailyCheckinDesc: 'Record your blood pressure, symptoms, and confirm daily regimen.',
    todayLogSummaryTitle: "Today's log summary",
    loggedToday: 'Telemetry recorded for today',
    notLoggedToday: 'No telemetry entered today',
    logNowButton: 'Log today →',
    recentLogsTitle: 'Recent health logs',
    recentLogsSubtitle: 'Longitudinal telemetry records for this synthetic patient ID',
    dateCol: 'Date',
    bpCol: 'Blood pressure',
    symptomsCol: 'Symptoms',
    medsCol: 'Medicines taken',
    statusCol: 'Status',

    logTodayTitle: 'Log today',
    logTodaySubtitle: 'Record daily telemetry to update your digital twin.',
    systolicLabel: 'Systolic blood pressure (mmHg)',
    diastolicLabel: 'Diastolic blood pressure (mmHg)',
    stepsLabel: 'Daily step count',
    medsTakenLabel: 'Daily medicines taken',
    medsTakenPrompt: 'Confirmed taking prescribed regimen for today',
    symptomsLabel: 'Symptoms experienced today',
    sympSwelling: 'Swollen ankles / feet',
    sympShortBreath: 'Shortness of breath',
    sympFatigue: 'Fatigue / unusual tiredness',
    sympNausea: 'Nausea / poor appetite',
    sympNone: 'None of these',
    saveLogButton: 'Save today’s log',
    logSuccessTitle: 'Daily log submitted successfully',
    logSuccessMsg: 'Your vitals and symptoms have been recorded in the digital twin.',
    urgentAlertTitle: 'Urgent: Seek emergency medical evaluation immediately',
    urgentAlertCall112: 'Emergency: Critical symptoms or blood pressure detected. Call 112 immediately. [Demonstration safety rule]',

    kidneyHealthTitle: 'My kidney health',
    kidneyHealthSubtitle: 'Longitudinal kidney score tracking and estimated 3-month trajectory.',
    chartTitle: 'Kidney score history & 3-month forecast',
    measuredLineLabel: 'Measured kidney score',
    projectedLineLabel: 'Projected 3-month estimate',
    uncertaintyBandLabel: '95% prediction interval',
    monthAxisLabel: 'Timeline (Months)',
    egfrAxisLabel: 'eGFR (mL/min/1.73 m²)',
    plainSummaryTitle: 'Plain-language progression summary',
    driversTitle: 'Top 3 progression drivers',
    notDiagnosisTitle: 'An estimate, not a diagnosis',
    notDiagnosisText: 'The trajectory and prediction bounds displayed above are computational model forecasts. They are research prototypes for the Digital Twin Challenge 2026, are NOT clinically validated, and must not be used for diagnosis or triage.',

    langHelpTitle: 'Language & help',
    langHelpSubtitle: 'Choose comfortable reading settings and find assistance.',
    yourLanguageTitle: 'Your language',
    yourLanguageDesc: 'Select your preferred language for all patient screens.',
    textSizeTitle: 'Text size',
    textSizeStandard: 'Standard · 18 px',
    textSizeLarger: 'Larger · 22 px',
    textSizePreview: 'Preview: Your next follow-up appointment is in review.',
    healthWorkerTitle: 'Community Health Worker',
    healthWorkerRole: 'Assigned Health Worker · Marathi, Hindi, English',
    healthWorkerDesc: 'Assistance with RENALIS logging, questions, or clinic appointment scheduling.',
    healthWorkerHours: 'Mon–Sat · 9:00 am – 5:00 pm',
    healthWorkerCallBtn: 'Call health worker',
    healthWorkerDemoNotice: 'Demo contact · Calling is simulated in this research prototype.',
    urgentHelpTitle: 'Need urgent help?',
    urgentHelpText: 'For severe chest pain, extreme breathlessness, or critical symptoms, call emergency services immediately.',
    emergencyCallBtn: 'Emergency · Call 112',
  },

  hi: {
    navHome: 'होम',
    navLogToday: 'आज का लॉग',
    navKidneyHealth: 'मेरा किडनी स्वास्थ्य',
    navLanguageHelp: 'भाषा और सहायता',
    navPatients: 'मरीज़ सूची',
    navPatientIntake: 'नया मरीज़ पंजीकरण',
    navReferralQueue: 'रेफ़रल कतार',
    navFollowUps: 'फॉलो-अप',
    navReports: 'रिपोर्ट्स',
    sectionYourCare: 'आपकी देखभाल',
    sectionCareTeam: 'केयर टीम',
    viewAs: 'भूमिका चुनें:',
    rolePatient: 'मरीज़',
    roleCareTeam: 'केयर टीम',
    patientPickerLabel: 'सक्रिय सिंथेटिक आईडी',
    patientPickerPlaceholder: 'आईडी खोजें...',
    demoNotice: 'केवल डेमो: सभी मरीज़ डेटा सिंथेटिक है · गैर-नैदानिक ​​शोध प्रोटोटाइप',

    helpBoxTitle: 'मदद के लिए यहां हैं',
    helpBoxDesc: 'अपने स्वास्थ्य कार्यकर्ता से बात करें।',
    helpBoxLink: 'स्वास्थ्य कार्यकर्ता को कॉल करें →',

    refresh: 'रिफ्रेश करें',
    refreshing: 'रिफ्रेश हो रहा है...',
    retry: 'पुनः प्रयास करें',
    save: 'सहेजें',
    saving: 'सहेजा जा रहा है...',
    saved: 'सफलतापूर्वक सहेजा गया',
    cancel: 'रद्द करें',
    open: 'खोलें',
    loading: 'लोड हो रहा है...',
    noData: 'अभी कोई डेटा उपलब्ध नहीं है',
    notRecorded: '–',
    serverOfflineTitle: 'सर्वर से संपर्क नहीं हो पा रहा है',
    serverOfflineDesc: 'http://127.0.0.1:8000 पर RENALIS बैकएंड से कनेक्ट करने में असमर्थ।',
    serverOfflineHelp: 'कृपया सुनिश्चित करें कि सर्वर चालू है: uvicorn app.main:app --reload',

    homeTitle: 'होम',
    homeSubtitle: 'सिंथेटिक मरीज़',
    kidneyScoreLabel: 'किडनी स्कोर (eGFR)',
    latestBpLabel: 'नवीनतम रक्तचाप',
    nextFollowUpLabel: 'अगली देखभाल फॉलो-अप',
    scheduledOn: 'नियत तारीख',
    noScheduledFollowUp: 'कोई आगामी फॉलो-अप निर्धारित नहीं है।',
    dailyCheckinTitle: 'दैनिक स्वास्थ्य जांच',
    dailyCheckinDesc: 'अपना रक्तचाप, लक्षण दर्ज करें और आज की दवाएं लेने की पुष्टि करें।',
    todayLogSummaryTitle: 'आज का सारांश',
    loggedToday: 'आज का डेटा सफलतापूर्वक दर्ज हुआ',
    notLoggedToday: 'आज कोई डेटा दर्ज नहीं किया गया है',
    logNowButton: 'आज का लॉग भरें →',
    recentLogsTitle: 'हाल के स्वास्थ्य लॉग',
    recentLogsSubtitle: 'इस सिंथेटिक मरीज़ आईडी के लिए दैनिक रिकॉर्ड',
    dateCol: 'तारीख',
    bpCol: 'रक्तचाप',
    symptomsCol: 'लक्षण',
    medsCol: 'दवा ली',
    statusCol: 'स्थिति',

    logTodayTitle: 'आज का लॉग',
    logTodaySubtitle: 'अपने डिजिटल ट्विन को अपडेट करने के लिए दैनिक डेटा दर्ज करें।',
    systolicLabel: 'सिस्टोलिक रक्तचाप (mmHg)',
    diastolicLabel: 'डायस्टोलिक रक्तचाप (mmHg)',
    stepsLabel: 'आज के कुल कदम',
    medsTakenLabel: 'दैनिक दवाएं लीं',
    medsTakenPrompt: 'पुष्टि करें कि आज की निर्धारित दवाएं ले ली हैं',
    symptomsLabel: 'आज महसूस हुए लक्षण',
    sympSwelling: 'टखनों या पैरों में सूजन',
    sympShortBreath: 'सांस लेने में तकलीफ',
    sympFatigue: 'अत्यधिक थकान या कमजोरी',
    sympNausea: 'जी मिचलाना / भूख कम लगना',
    sympNone: 'इनमें से कोई नहीं',
    saveLogButton: 'आज का लॉग सहेजें',
    logSuccessTitle: 'दैनिक लॉग सफलतापूर्वक जमा हुआ',
    logSuccessMsg: 'आपकी विटल्स और लक्षण डिजिटल ट्विन में सुरक्षित कर दिए गए हैं।',
    urgentAlertTitle: 'आपातकालीन चेतावनी: तुरंत चिकित्सा सहायता लें',
    urgentAlertCall112: 'आपातकाल: सांस फूलना या अत्यधिक रक्तचाप दर्ज हुआ। कृपया तुरंत 112 पर कॉल करें। [डेमो सुरक्षा नियम]',

    kidneyHealthTitle: 'मेरा किडनी स्वास्थ्य',
    kidneyHealthSubtitle: 'किडनी स्कोर का ऐतिहासिक विवरण और 3 महीने का अनुमानित रुझान।',
    chartTitle: 'किडनी स्कोर इतिहास और 3 महीने का पूर्वानुमान',
    measuredLineLabel: 'मापा गया किडनी स्कोर',
    projectedLineLabel: '3 महीने का अनुमानित रुझान',
    uncertaintyBandLabel: '95% अनिश्चितता दायरा',
    monthAxisLabel: 'समय रेखा (महीने)',
    egfrAxisLabel: 'eGFR (mL/min/1.73 m²)',
    plainSummaryTitle: 'सरल भाषा में रुझान सारांश',
    driversTitle: 'शीर्ष 3 प्रभावित करने वाले कारक',
    notDiagnosisTitle: 'एक अनुमान, कोई निदान नहीं',
    notDiagnosisText: 'ऊपर दिखाया गया प्रक्षेपवक्र कम्प्यूटेशनल मॉडल का एक अनुमान है। यह डिजिटल ट्विन चैलेंज 2026 के लिए एक शोध प्रोटोटाइप है, चिकित्सकीय रूप से सत्यापित नहीं है, और इसका उपयोग निदान के लिए नहीं किया जाना चाहिए।',

    langHelpTitle: 'भाषा और सहायता',
    langHelpSubtitle: 'अपनी सुविधा अनुसार भाषा और टेक्स्ट का आकार चुनें।',
    yourLanguageTitle: 'आपकी भाषा',
    yourLanguageDesc: 'मरीज़ के सभी पृष्ठों के लिए अपनी पसंदीदा भाषा चुनें।',
    textSizeTitle: 'अक्षरों का आकार',
    textSizeStandard: 'मानक · 18 px',
    textSizeLarger: 'बड़ा · 22 px',
    textSizePreview: 'पूर्वावलोकन: आपकी अगली फॉलो-अप समीक्षा विचाराधीन है।',
    healthWorkerTitle: 'सामुदायिक स्वास्थ्य कार्यकर्ता',
    healthWorkerRole: 'आवंटित स्वास्थ्य कार्यकर्ता · मराठी, हिंदी, अंग्रेजी',
    healthWorkerDesc: 'RENALIS उपयोग, दैनिक लॉगिंग या क्लिनिक अपॉइंटमेंट में सहायता के लिए।',
    healthWorkerHours: 'सोम–शनि · सुबह 9:00 से शाम 5:00 तक',
    healthWorkerCallBtn: 'स्वास्थ्य कार्यकर्ता को कॉल करें',
    healthWorkerDemoNotice: 'डेमो संपर्क · कॉल केवल इस प्रोटोटाइप में सिम्युलेटेड है।',
    urgentHelpTitle: 'क्या आपको तत्काल सहायता चाहिए?',
    urgentHelpText: 'गंभीर सीने में दर्द या अत्यधिक सांस फूलने की स्थिति में तुरंत आपातकालीन सेवाओं से संपर्क करें।',
    emergencyCallBtn: 'आपातकालीन · 112 पर कॉल करें',
  },

  mr: {
    navHome: 'मुख्यपृष्ठ',
    navLogToday: 'आजची नोंद',
    navKidneyHealth: 'माझे मूत्रपिंड आरोग्य',
    navLanguageHelp: 'भाषा आणि मदत',
    navPatients: 'रुग्ण यादी',
    navPatientIntake: 'नवीन रुग्ण नोंदणी',
    navReferralQueue: 'रेफरल रांग',
    navFollowUps: 'फॉलो-अप',
    navReports: 'अहवाल',
    sectionYourCare: 'तुमची काळजी',
    sectionCareTeam: 'केअर टीम',
    viewAs: 'भूमिका बदला:',
    rolePatient: 'रुग्ण',
    roleCareTeam: 'केअर टीम',
    patientPickerLabel: 'सक्रिय सिंथेटिक आयडी',
    patientPickerPlaceholder: 'आयडी शोधा...',
    demoNotice: 'केवळ डेमो: सर्व रुग्ण डेटा सिंथेटिक आहे · गैर-वैद्यकीय संशोधन प्रोटोटाइप',

    helpBoxTitle: 'मदतीसाठी येथे आहोत',
    helpBoxDesc: 'आपल्या आरोग्य सेविकेशी बोला.',
    helpBoxLink: 'आरोग्य सेविकेला कॉल करा →',

    refresh: 'ताजे करा',
    refreshing: 'ताजे होत आहे...',
    retry: 'पुन्हा प्रयत्न करा',
    save: 'जतन करा',
    saving: 'जतन करत आहे...',
    saved: 'यशस्वीरीत्या जतन केले',
    cancel: 'रद्द करा',
    open: 'उघडा',
    loading: 'लोड होत आहे...',
    noData: 'अद्याप कोणतीही माहिती नाही',
    notRecorded: '–',
    serverOfflineTitle: 'सर्व्हरशी संपर्क होत नाही',
    serverOfflineDesc: 'http://127.0.0.1:8000 वरील RENALIS बॅकएंडशी कनेक्ट करण्यात अडचण येत आहे.',
    serverOfflineHelp: 'कृपया खात्री करा की सर्व्हर चालू आहे: uvicorn app.main:app --reload',

    homeTitle: 'मुख्यपृष्ठ',
    homeSubtitle: 'सिंथेटिक रुग्ण',
    kidneyScoreLabel: 'मूत्रपिंड गुण (eGFR)',
    latestBpLabel: 'नुकताच मोजलेला रक्तदाब',
    nextFollowUpLabel: 'पुढील तपासणी फॉलो-अप',
    scheduledOn: 'नियोजित तारीख',
    noScheduledFollowUp: 'कोणतीही नियोजित पुढील तपासणी नाही.',
    dailyCheckinTitle: 'दैनंदिन आरोग्य तपासणी',
    dailyCheckinDesc: 'आपला रक्तदाब, लक्षणे नोंदवा आणि औषधे घेतल्याची पुष्टी करा.',
    todayLogSummaryTitle: 'आजचा नोंदणी सारांश',
    loggedToday: 'आजची माहिती यशस्वीरीत्या नोंदवली गेली',
    notLoggedToday: 'आज कोणतीही नोंद केलेली नाही',
    logNowButton: 'आजची नोंद करा →',
    recentLogsTitle: 'नुकत्याच केलेल्या नोंदी',
    recentLogsSubtitle: 'या सिंथेटिक रुग्ण आयडीसाठी नोंदी',
    dateCol: 'तारीख',
    bpCol: 'रक्तदाब',
    symptomsCol: 'लक्षणे',
    medsCol: 'औषध घेतले',
    statusCol: 'स्थिती',

    logTodayTitle: 'आजची नोंद',
    logTodaySubtitle: 'आपला डिजिटल ट्विन अद्ययावत करण्यासाठी दैनंदिन माहिती भरा.',
    systolicLabel: 'सिस्टोलिक रक्तदाब (mmHg)',
    diastolicLabel: 'डायस्टोलिक रक्तदाब (mmHg)',
    stepsLabel: 'आज चाललेली पावले',
    medsTakenLabel: 'नियमित औषधे घेतली',
    medsTakenPrompt: 'आज ठरवून दिलेली औषधे घेतल्याची पुष्टी करा',
    symptomsLabel: 'आज जाणवलेली लक्षणे',
    sympSwelling: 'घोट्यांवर किंवा पायांवर सूज',
    sympShortBreath: 'श्वास घेण्यास त्रास',
    sympFatigue: 'अतिशय थकवा किंवा अशक्तपणा',
    sympNausea: 'मळमळ / भूक मंदावणे',
    sympNone: 'यांपैकी काहीही नाही',
    saveLogButton: 'आजची नोंद जतन करा',
    logSuccessTitle: 'दैनंदिन नोंद यशस्वीरीत्या जतन झाली',
    logSuccessMsg: 'आपली माहिती डिजिटल ट्विनमध्ये नोंदवण्यात आली आहे.',
    urgentAlertTitle: 'तातडीची सूचना: त्वरित वैद्यकीय मदत घ्या',
    urgentAlertCall112: 'आणीबाणी: धाप लागणे किंवा अत्यंत उच्च रक्तदाब नोंदवला गेला. त्वरित 112 वर कॉल करा. [डेमो सुरक्षा नियम]',

    kidneyHealthTitle: 'माझे मूत्रपिंड आरोग्य',
    kidneyHealthSubtitle: 'मूत्रपिंड गुणांचा इतिहास आणि पुढील ३ महिन्यांचा अंदाज.',
    chartTitle: 'मूत्रपिंड गुण इतिहास आणि ३ महिन्यांचा अंदाज',
    measuredLineLabel: 'मोजलेले मूत्रपिंड गुण',
    projectedLineLabel: 'पुढील ३ महिन्यांचा अंदाज',
    uncertaintyBandLabel: '९५% संभाव्य मर्यादा',
    monthAxisLabel: 'कालावधी (महिने)',
    egfrAxisLabel: 'eGFR (mL/min/1.73 m²)',
    plainSummaryTitle: 'साध्या भाषेतील सारांश',
    driversTitle: 'शीर्ष ३ मुख्य घटक',
    notDiagnosisTitle: 'हा केवळ अंदाज आहे, निदान नाही',
    notDiagnosisText: 'वर दर्शविलेला आलेख हा कॉम्प्युटेशनल मॉडेलचा अंदाज आहे. हा डिजिटल ट्विन चॅलेंज २०२६ साठी एक संशोधन प्रोटोटाइप आहे, वैद्यकीयदृष्ट्या प्रमाणित नाही आणि निदानासाठी वापरला जाऊ नये.',

    langHelpTitle: 'भाषा आणि मदत',
    langHelpSubtitle: 'सोयीस्कर वाचनासाठी भाषा आणि अक्षरांचा आकार निवडा.',
    yourLanguageTitle: 'आपली भाषा',
    yourLanguageDesc: 'रुग्णाच्या सर्व पानांसाठी आपली आवडती भाषा निवडा.',
    textSizeTitle: 'अक्षरांचा आकार',
    textSizeStandard: 'प्रमाणित · 18 px',
    textSizeLarger: 'मोठा · 22 px',
    textSizePreview: 'पूर्वावलोकन: आपली पुढील तपासणी विचाराधीन आहे.',
    healthWorkerTitle: 'समुदाय आरोग्य सेविका',
    healthWorkerRole: 'नियुक्त आरोग्य सेविका · मराठी, हिंदी, इंग्रजी',
    healthWorkerDesc: 'RENALIS वापरण्यास किंवा तपासणीसाठी मदत हवी असल्यास संपर्क करा.',
    healthWorkerHours: 'सोम–शनि · सकाळी ९:०० ते संध्याकाळी ५:००',
    healthWorkerCallBtn: 'आरोग्य सेविकेला कॉल करा',
    healthWorkerDemoNotice: 'डेमो संपर्क · कॉल केवळ या प्रोटोटाइपमध्ये सिम्युलेटेड आहे.',
    urgentHelpTitle: 'तातडीची मदत हवी आहे का?',
    urgentHelpText: 'छातीत तीव्र वेदना किंवा श्वास घेण्यास खूप त्रास होत असल्यास त्वरित संपर्क करा.',
    emergencyCallBtn: 'आणीबाणी · 112 वर कॉल करा',
  },
};

export function getTranslation(lang: AppLanguage): Translations {
  return translations[lang] || translations.en;
}
