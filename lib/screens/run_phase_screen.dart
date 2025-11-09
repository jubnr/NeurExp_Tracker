// lib/screens/run_phase_screen.dart
import 'package:flutter/material.dart';
import 'package:neurexp_tracker/models/participant.dart';
import 'package:neurexp_tracker/models/study.dart';
import 'package:neurexp_tracker/utils/constants.dart';

// Modèle pour représenter une information enregistrée pendant un run
class RunInfo {
  final String runId;
  String notes;
  String participantResponse; // Réponse du participant
  String participantImpressionEmoji; // Emoji pour l'impression du participant
  String? imageUrl; // Photo prise pendant le run
  String? problematicChannels; // Canaux problématiques

  RunInfo({
    required this.runId,
    this.notes = '',
    this.participantResponse = '',
    this.participantImpressionEmoji = '😐', // Emoji par défaut
    this.imageUrl,
    this.problematicChannels,
  });
}

class RunPhaseScreen extends StatefulWidget {
  final Study study;
  final Participant participant;

  const RunPhaseScreen({
    super.key,
    required this.study,
    required this.participant,
  });

  @override
  State<RunPhaseScreen> createState() => _RunPhaseScreenState();
}

class _RunPhaseScreenState extends State<RunPhaseScreen> {
  List<RunInfo> _runInfos = [];
  int _currentRunIndex = 0;
  // Controllers pour les champs de saisie
  final TextEditingController _notesController = TextEditingController();
  final TextEditingController _responseController = TextEditingController();
  final TextEditingController _channelsController = TextEditingController();

  @override
  void initState() {
    super.initState();
    // Initialiser les runs basés sur l'étude
    _initializeRuns();
  }

  void _initializeRuns() {
    // Crée autant d'objets RunInfo que de runs par session x sessions par participant
    // Pour l'instant, on utilise le nombre de runs par session de l'étude comme base.
    // Une logique plus fine serait de spécifier le nombre total de runs par participant.
    final int numberOfRuns = widget.study.runsPerSession;
    _runInfos = List.generate(numberOfRuns, (index) {
      return RunInfo(runId: 'Run ${index + 1}');
    });
  }

  // Obtenir le run actuel
  RunInfo get _currentRun => _runInfos[_currentRunIndex];

  // Gérer le passage au run suivant
  void _nextRun() {
    if (_currentRunIndex < _runInfos.length - 1) {
      setState(() {
        _currentRunIndex++;
      });
    } else {
      // C'est le dernier run, passer à la phase post-expérience
      _navigateToPostExperience();
    }
  }

  // Naviguer vers la phase post-expérience
  void _navigateToPostExperience() {
    // TODO: Implémenter la navigation vers PostExperienceScreen
    print('Tous les runs terminés pour ${widget.participant.nip} !');
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Phase expérimentale terminée !')),
    );
    // Exemple de navigation :
    // Navigator.of(context).pushReplacement(
    //   MaterialPageRoute(
    //     builder: (context) => PostExperienceScreen(
    //       study: widget.study,
    //       participant: widget.participant,
    //       // Passer les infos des runs si nécessaire
    //     ),
    //   ),
    // );
  }

  // Pour sélectionner un emoji d'impression
  void _selectImpressionEmoji() {
    // Un simple dialogue pour choisir un emoji. Vous pouvez améliorer cela.
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Impression du participant'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _buildEmojiButton('😊', 'Investi'),
                  _buildEmojiButton('😐', 'Neutre/Calme'),
                  _buildEmojiButton('😴', 'Endormi'),
                  _buildEmojiButton('😕', 'Désintéressé'),
                ],
              ),
              const SizedBox(height: 10),
              Text('Autre:', style: kCardSubtitleTextStyle),
              TextField( // Pour entrer un autre emoji si besoin
                 controller: TextEditingController(text: _currentRun.participantImpressionEmoji),
                 onChanged: (value) {
                   if (value.isNotEmpty) {
                      setState(() {
                        _currentRun.participantImpressionEmoji = value;
                      });
                   }
                 },
                 decoration: const InputDecoration(hintText: 'Emoji'),
              )
            ],
          ),
        );
      },
    );
  }

  Widget _buildEmojiButton(String emoji, String tooltip) {
    return InkWell(
      onTap: () {
        setState(() {
          _currentRun.participantImpressionEmoji = emoji;
        });
        Navigator.of(context).pop(); // Fermer le dialogue
      },
      child: Padding(
        padding: const EdgeInsets.all(8.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(emoji, style: const TextStyle(fontSize: 30)),
            Text(tooltip, style: kCardSubtitleTextStyle.copyWith(fontSize: 10)),
          ],
        ),
      ),
    );
  }

  // Gérer la prise de photo (placeholder)
  void _takePhoto() {
    print('Prendre une photo...');
    // TODO: Implémenter la logique de prise de photo (avec image_picker par exemple)
    // et assigner l'URL de l'image à _currentRun.imageUrl
  }

  @override
  Widget build(BuildContext context) {
    // Pour l'instant, on utilise les controllers pour le run actuel
    // Dans une app réelle, il faudrait charger/sauvegarder les infos pour chaque run
    _notesController.text = _currentRun.notes;
    _responseController.text = _currentRun.participantResponse;
    _channelsController.text = _currentRun.problematicChannels ?? '';

    return Scaffold(
      appBar: AppBar(
        title: Text('Run ${widget.participant.nip} (${_currentRun.runId})'),
        centerTitle: true,
        actions: [
          // Bouton pour passer au run suivant
          IconButton(
            icon: const Icon(Icons.arrow_forward_ios),
            tooltip: 'Passer au run suivant',
            onPressed: _nextRun,
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: ListView(
          children: [
            // Informations sur l'estimation de fin d'expérience (à implémenter)
            // Text('Estimation heure de fin: ...'),

            // Instructions spécifiques au run (si définies dans l'étude)
            if (widget.study.duringExperimentInstructions.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(bottom: 16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Instructions spécifiques au run :',
                      style: kSubtitleTextStyle.copyWith(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    ...widget.study.duringExperimentInstructions.map((instruction) => Padding(
                      padding: const EdgeInsets.only(bottom: 4.0),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(Icons.info_outline, color: kLightBlue, size: 18),
                          const SizedBox(width: 8),
                          Expanded(child: Text(instruction, style: kCardSubtitleTextStyle)),
                        ],
                      ),
                    )).toList(),
                  ],
                ),
              ),

            // Notes du chercheur
            TextFormField(
              controller: _notesController,
              decoration: const InputDecoration(labelText: 'Notes du chercheur'),
              onChanged: (value) => _currentRun.notes = value,
            ),
            const SizedBox(height: 16),

            // Réponses du participant
            TextFormField(
              controller: _responseController,
              decoration: const InputDecoration(labelText: 'Réponse(s) du participant'),
              onChanged: (value) => _currentRun.participantResponse = value,
            ),
            const SizedBox(height: 16),

            // Impression du participant
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Impression du participant:', style: kSubtitleTextStyle),
                Row(
                  children: [
                    Text(_currentRun.participantImpressionEmoji, style: const TextStyle(fontSize: 28)),
                    const SizedBox(width: 10),
                    IconButton(
                      icon: const Icon(Icons.emoji_emotions_outlined),
                      tooltip: 'Choisir une impression',
                      onPressed: _selectImpressionEmoji,
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Canaux problématiques
            TextFormField(
              controller: _channelsController,
              decoration: const InputDecoration(labelText: 'Canaux problématiques (si applicable)'),
              onChanged: (value) => _currentRun.problematicChannels = value,
            ),
            const SizedBox(height: 16),

            // Photo pendant le run
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                ElevatedButton.icon(
                  icon: const Icon(Icons.camera_alt),
                  label: const Text('Prendre une photo'),
                  onPressed: _takePhoto,
                ),
                if (_currentRun.imageUrl != null)
                  Padding(
                    padding: const EdgeInsets.only(left: 10.0),
                    child: Image.network(_currentRun.imageUrl!, height: 80), // Afficher la photo prise
                  ),
              ],
            ),
            const SizedBox(height: 32),

            // Bouton pour "Terminer l'expérience" (qui mène à PostExperienceScreen)
            Center(
              child: ElevatedButton(
                onPressed: () {
                  // Sauvegarder les infos du run actuel avant de passer à la suite
                  // Pour l'instant, les saisies sont mises à jour directement sur _currentRun
                  _navigateToPostExperience(); // Appel direct pour l'instant
                },
                style: ElevatedButton.styleFrom(backgroundColor: Colors.orange[700]), // Bouton plus visible
                child: const Text('Terminer cette session / Aller aux notes post-expérience'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}