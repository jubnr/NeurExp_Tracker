// lib/screens/preparation_screen.dart
import 'package:flutter/material.dart';
import 'package:neurexp_tracker/models/participant.dart';
import 'package:neurexp_tracker/models/study.dart';
import 'package:neurexp_tracker/utils/constants.dart'; // Pour les couleurs
import 'package:neurexp_tracker/screens/run_phase_screen.dart'; // <-- AJOUTEZ CETTE LIGNE

// Modèle pour représenter une tâche
class Task {
  final String id;
  String description;
  bool isCompleted;
  String? imageUrl; // Optionnel pour les photos
  List<String> predefinedInstructions; // Instructions entrées lors de la création de l'étude

  Task({
    required this.id,
    required this.description,
    this.isCompleted = false,
    this.imageUrl,
    this.predefinedInstructions = const [],
  });
}

class PreparationScreen extends StatefulWidget {
  final Study study;
  final Participant participant;

  const PreparationScreen({
    super.key,
    required this.study,
    required this.participant,
  });

  @override
  State<PreparationScreen> createState() => _PreparationScreenState();
}

class _PreparationScreenState extends State<PreparationScreen> {
  // Liste des tâches pour la préparation.
  // Dans une vraie app, cela pourrait être chargé depuis l'étude ou un service.
  List<Task> _preparationTasks = [];
  int _currentTaskIndex = 0;

  @override
  void initState() {
    super.initState();
    _loadPreparationTasks();
  }

  // Charger les tâches. Pour l'instant, elles sont codées en dur.
  // Plus tard, on pourra les récupérer depuis l'objet 'study'.
  void _loadPreparationTasks() {
    // Exemple de tâches statiques. Vous devriez les charger dynamiquement.
    _preparationTasks = [
      Task(id: 'prep1', description: 'Préparer les électrodes'),
      Task(id: 'prep2', description: 'Mettre la MEG en position 68°'),
      Task(id: 'prep3', description: 'Enregistrer une "empty room"'),
      Task(id: 'prep4', description: 'Préparer le script de stimulation'),
      // Ajoutez d'autres tâches ici
    ];

    // Si l'étude a des instructions prédéfinies pour cette phase, on peut les ajouter
    // Note: La logique exacte de où ces instructions sont stockées dans 'study' est à définir.
    // Ici, on suppose qu'il y aurait une liste d'instructions spécifiques pour la phase 'preparation'.
    if (widget.study.preparationInstructions.isNotEmpty) {
      // Insérer les instructions prédéfinies après une certaine tâche (par exemple, après la préparation des électrodes)
      // La position exacte dépend de votre workflow.
      // Ici, on les insère juste avant la fin.
      _preparationTasks.insert(
        _preparationTasks.length - 1, // Insère avant la dernière tâche
        Task(
          id: 'prep_instr_study',
          description: 'Instructions de l\'étude : ${widget.study.preparationInstructions.join('; ')}',
          predefinedInstructions: widget.study.preparationInstructions, // Stocker les instructions originales
        ),
      );
    }

    // Assurez-vous que le nombre de tâches ne dépasse pas le nombre attendu
    // Par exemple, on peut fixer un nombre maximum ou gérer cela différemment.
    // Pour l'instant, on prend les 5 premières tâches si on en a plus.
    if (_preparationTasks.length > 5) {
      _preparationTasks = _preparationTasks.take(5).toList();
    }
  }

  // Marquer la tâche actuelle comme complétée et passer à la suivante
  void _completeCurrentTask() {
    if (_currentTaskIndex < _preparationTasks.length) {
      setState(() {
        _preparationTasks[_currentTaskIndex].isCompleted = true;
        _currentTaskIndex++;
      });
    }

    // Si c'est la dernière tâche, passer à la phase suivante
    if (_currentTaskIndex >= _preparationTasks.length) {
      // Aller à la phase expérimentale
      _navigateToRunPhase();
    }
  }

  // Naviguer vers la phase expérimentale
  void _navigateToRunPhase() {
    print('Préparation terminée ! Passage à la phase expérimentale.');
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Préparation terminée !')),
    );
    // Exemple de navigation :
    Navigator.of(context).pushReplacement( // Utiliser pushReplacement pour ne pas revenir à la préparation après
      MaterialPageRoute(
        builder: (context) => RunPhaseScreen( // Assurez-vous que RunPhaseScreen est bien importé
          study: widget.study,
          participant: widget.participant,
        ),
      ),
    );
  }

  // Permettre de passer à la tâche suivante sans la cocher (bouton en haut à droite)
  void _skipTask() {
    if (_currentTaskIndex < _preparationTasks.length) {
      setState(() {
        // On marque juste la tâche comme complétée (ou on la laisse non cochée si on veut le montrer)
        // Ici, on la coche pour le passage à la suivante
        _preparationTasks[_currentTaskIndex].isCompleted = true;
        _currentTaskIndex++;
      });
      if (_currentTaskIndex >= _preparationTasks.length) {
        _navigateToRunPhase();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final bool isLastTask = _currentTaskIndex >= _preparationTasks.length;

    return Scaffold(
      appBar: AppBar(
        title: Text('Préparation - ${widget.participant.nip}'),
        centerTitle: true,
        leading: IconButton( // Bouton retour (optionnel, dépend de votre flux)
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            // Gérer le retour si nécessaire, peut-être en demandant confirmation
            Navigator.of(context).pop();
          },
        ),
        actions: [
          if (!isLastTask) // Afficher le bouton "Passer" sauf si c'est la dernière tâche
            IconButton(
              icon: const Icon(Icons.skip_next),
              tooltip: 'Passer cette tâche',
              onPressed: _skipTask,
            ),
        ],
      ),
      body: _preparationTasks.isEmpty
          ? const Center(child: Text('Aucune tâche de préparation définie.'))
          : Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                children: [
                  // Affichage de la tâche courante
                  Expanded(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        if (_currentTaskIndex < _preparationTasks.length)
                          _buildTaskWidget(_preparationTasks[_currentTaskIndex])
                        else
                          // Si toutes les tâches sont terminées
                          Column(
                            children: [
                              Icon(Icons.check_circle, color: Colors.green[700], size: 80),
                              const SizedBox(height: 20),
                              Text(
                                'Toutes les tâches de préparation sont terminées !',
                                textAlign: TextAlign.center,
                                style: kTitleTextStyle.copyWith(fontSize: 22),
                              ),
                              const SizedBox(height: 10),
                              ElevatedButton(
                                onPressed: _navigateToRunPhase,
                                child: const Text('Passer à la phase expérimentale'),
                              ),
                            ],
                          ),
                      ],
                    ),
                  ),
                  // Bouton pour compléter la tâche (s'il y a une tâche courante)
                  if (_currentTaskIndex < _preparationTasks.length && !_preparationTasks[_currentTaskIndex].isCompleted)
                    Padding(
                      padding: const EdgeInsets.only(top: 20.0),
                      child: Center(
                        child: ElevatedButton(
                          onPressed: _completeCurrentTask,
                          child: const Text('Marquer comme terminé et continuer'),
                        ),
                      ),
                    ),
                ],
              ),
            ),
    );
  }

  // Widget pour afficher une tâche
  Widget _buildTaskWidget(Task task) {
    return Column(
      mainAxisSize: MainAxisSize.min, // Prend juste la place nécessaire
      children: [
        // Icône de statut (à remplir/cocher)
        Icon(
          task.isCompleted ? Icons.check_circle_outline : Icons.radio_button_unchecked,
          color: task.isCompleted ? Colors.green.shade700 : kLightBlue,
          size: 60.0,
        ),
        const SizedBox(height: 20),
        // Description de la tâche
        Text(
          task.description,
          textAlign: TextAlign.center,
          style: kTitleTextStyle.copyWith(fontSize: 20.0),
        ),
        // Afficher les instructions prédéfinies si elles existent (après la description)
        if (task.predefinedInstructions.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Instructions spécifiques :',
                  style: kSubtitleTextStyle.copyWith(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                ...task.predefinedInstructions.map((instruction) => Padding(
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
        // Placeholder pour l'image si nécessaire
        if (task.imageUrl != null)
          Padding(
            padding: const EdgeInsets.only(top: 20.0),
            child: Image.network(task.imageUrl!, height: 150), // Ou Image.asset si l'image est locale
          ),
      ],
    );
  }
}