// lib/screens/home_screen.dart (Mise à jour)
import 'package:flutter/material.dart';
import 'package:neurexp_tracker/models/study.dart';
import 'package:neurexp_tracker/widgets/study_card.dart';
import 'package:neurexp_tracker/screens/add_study_screen.dart';
// Importez StudyDetailScreen ici si vous avez besoin de l'utiliser dans HomeScreen pour une raison quelconque,
// mais pour la navigation, c'est déjà géré dans StudyCard.

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  // Liste des études (à remplacer par une source de données réelle plus tard)
  List<Study> _studies = [];

  @override
  void initState() {
    super.initState();
    // Ajouter quelques études fictives pour tester
    _studies = [
      Study(
        id: 's1',
        name: 'Étude Mémoire Long Terme',
        description: 'Analyse de la rétention de mémoire après exposition.',
        machineType: 'MEG',
        expectedParticipants: 30,
        sessionsPerParticipant: 2,
        runsPerSession: 3,
        runType: 'Task',
        completedParticipants: 5, // 5 participants complétés
      ),
      Study(
        id: 's2',
        name: 'Étude Réponse Émotionnelle',
        description: 'Mesure de l\'activité cérébrale lors de la perception d\'émotions.',
        machineType: 'IRM 3T',
        expectedParticipants: 50,
        sessionsPerParticipant: 1,
        runsPerSession: 2,
        runType: 'Resting State',
        completedParticipants: 15, // 15 participants complétés
      ),
      Study(
        id: 's3',
        name: 'Étude Sommeil et Cognition',
        description: 'Impact du sommeil sur les fonctions cognitives.',
        machineType: 'MEG',
        expectedParticipants: 20,
        sessionsPerParticipant: 3,
        runsPerSession: 4,
        runType: 'Task',
        completedParticipants: 0, // 0 participants complétés
      ),
    ];
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mes expériences'),
        centerTitle: true,
      ),
      body: _studies.isEmpty
          ? const Center(
              child: Text('Aucune expérience trouvée. Ajoutez-en une !'),
            )
          : Padding( // Ajout d'un padding pour que les cartes ne touchent pas les bords
              padding: const EdgeInsets.all(16.0),
              child: ListView.builder(
                itemCount: _studies.length,
                itemBuilder: (context, index) {
                  return StudyCard(study: _studies[index]);
                },
              ),
            ),
      floatingActionButton: FloatingActionButton(
        onPressed: () async {
          final newStudy = await Navigator.of(context).push(
            MaterialPageRoute(builder: (context) => const AddStudyScreen()),
          );
          if (newStudy != null && newStudy is Study) {
            setState(() {
              _studies.add(newStudy);
            });
          }
        },
        tooltip: 'Ajouter une nouvelle étude',
        child: const Icon(Icons.add),
      ),
    );
  }
}